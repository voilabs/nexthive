use std::time::Duration;

use reqwest::blocking::{Client, RequestBuilder};
use reqwest::{StatusCode, Url};
use serde::Deserialize;
use serde_json::json;

use crate::errors::{AppError, AppResult};
use crate::models::AiProvider;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(8);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

pub fn default_base_url(provider: AiProvider) -> Option<&'static str> {
    match provider {
        AiProvider::OpenAi => Some("https://api.openai.com/v1"),
        AiProvider::OpenRouter => Some("https://openrouter.ai/api/v1"),
        AiProvider::Anthropic => Some("https://api.anthropic.com"),
        AiProvider::Ollama => Some("http://127.0.0.1:11434"),
        AiProvider::Custom => None,
    }
}

pub fn normalize_base_url(provider: AiProvider, value: Option<&str>) -> AppResult<String> {
    let candidate = value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or_else(|| default_base_url(provider))
        .ok_or_else(|| AppError::Validation("Enter the custom API base URL.".into()))?;
    let mut url = Url::parse(candidate)
        .map_err(|_| AppError::Validation("The AI provider URL is invalid.".into()))?;
    if url.username() != "" || url.password().is_some() {
        return Err(AppError::Validation(
            "Do not include credentials in the AI provider URL.".into(),
        ));
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err(AppError::Validation(
            "The AI provider URL cannot contain a query or fragment.".into(),
        ));
    }
    let local_host = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"));
    let official_host = match provider {
        AiProvider::OpenAi => Some("api.openai.com"),
        AiProvider::OpenRouter => Some("openrouter.ai"),
        AiProvider::Anthropic => Some("api.anthropic.com"),
        AiProvider::Ollama | AiProvider::Custom => None,
    };
    if official_host.is_some_and(|expected| url.host_str() != Some(expected)) {
        return Err(AppError::Validation(format!(
            "{} connections must use the official API host. Choose Custom AI endpoint for another server.",
            provider.display_name()
        )));
    }
    if provider == AiProvider::Ollama && !local_host {
        return Err(AppError::Validation(
            "Ollama connections must use a loopback address. Choose Custom AI endpoint for a remote compatible server."
                .into(),
        ));
    }
    if url.scheme() != "https" && !(url.scheme() == "http" && local_host) {
        return Err(AppError::Validation(
            "AI provider URLs must use HTTPS. Plain HTTP is allowed only for a local server."
                .into(),
        ));
    }
    let path = url.path().trim_end_matches('/').to_string();
    url.set_path(if path.is_empty() { "/" } else { &path });
    Ok(url.to_string().trim_end_matches('/').to_string())
}

fn endpoint(base_url: &str, suffix: &str) -> String {
    if base_url.ends_with(suffix) {
        base_url.to_string()
    } else {
        format!("{}{suffix}", base_url.trim_end_matches('/'))
    }
}

fn provider_endpoint(provider: AiProvider, base_url: &str) -> String {
    match provider {
        AiProvider::Anthropic if base_url.ends_with("/v1") => endpoint(base_url, "/messages"),
        AiProvider::Anthropic => endpoint(base_url, "/v1/messages"),
        AiProvider::Ollama if base_url.ends_with("/api") => endpoint(base_url, "/chat"),
        AiProvider::Ollama => endpoint(base_url, "/api/chat"),
        _ => endpoint(base_url, "/chat/completions"),
    }
}

fn client() -> AppResult<Client> {
    Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .user_agent("NextHive/0.1")
        .build()
        .map_err(Into::into)
}

fn send(request: RequestBuilder, provider: AiProvider) -> AppResult<reqwest::blocking::Response> {
    let response = request.send()?;
    if response.status().is_success() {
        return Ok(response);
    }
    let status = response.status();
    let message = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => format!(
            "{} rejected the API key. Check the credential and model access.",
            provider.display_name()
        ),
        StatusCode::NOT_FOUND => format!(
            "{} could not find the configured endpoint or model.",
            provider.display_name()
        ),
        StatusCode::TOO_MANY_REQUESTS => format!(
            "{} rate-limited the request. The normal backup message will be used.",
            provider.display_name()
        ),
        _ => format!(
            "{} returned HTTP {} while generating a commit message.",
            provider.display_name(),
            status.as_u16()
        ),
    };
    Err(AppError::Ai(message))
}

#[derive(Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Deserialize)]
struct OpenAiChoice {
    message: OpenAiMessage,
}

#[derive(Deserialize)]
struct OpenAiMessage {
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    kind: String,
    text: Option<String>,
}

#[derive(Deserialize)]
struct OllamaResponse {
    message: OllamaMessage,
}

#[derive(Deserialize)]
struct OllamaMessage {
    content: String,
}

pub fn generate(
    provider: AiProvider,
    base_url: &str,
    model: &str,
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
) -> AppResult<String> {
    let client = client()?;
    let content = match provider {
        AiProvider::Anthropic => {
            let key = api_key.ok_or_else(|| {
                AppError::Ai("No Anthropic API key is stored for this connection.".into())
            })?;
            let request = client
                .post(provider_endpoint(provider, base_url))
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .json(&json!({
                    "model": model,
                    "max_tokens": 180,
                    "temperature": 0.2,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}]
                }));
            let payload: AnthropicResponse = send(request, provider)?.json()?;
            payload
                .content
                .into_iter()
                .find(|part| part.kind == "text")
                .and_then(|part| part.text)
                .ok_or_else(|| AppError::Ai("Anthropic returned no text.".into()))?
        }
        AiProvider::Ollama => {
            let request = client
                .post(provider_endpoint(provider, base_url))
                .json(&json!({
                    "model": model,
                    "stream": false,
                    "think": false,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "options": {"temperature": 0.2, "num_predict": 180}
                }));
            send(request, provider)?
                .json::<OllamaResponse>()?
                .message
                .content
        }
        AiProvider::OpenAi | AiProvider::OpenRouter | AiProvider::Custom => {
            let mut request = client
                .post(provider_endpoint(provider, base_url))
                .json(&json!({
                    "model": model,
                    "stream": false,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }));
            if let Some(key) = api_key.filter(|key| !key.is_empty()) {
                request = request.bearer_auth(key);
            }
            if provider == AiProvider::OpenRouter {
                request = request
                    .header("HTTP-Referer", "https://nexthive.voilabs.com")
                    .header("X-Title", "NextHive");
            }
            let payload: OpenAiResponse = send(request, provider)?.json()?;
            payload
                .choices
                .into_iter()
                .next()
                .map(|choice| choice.message.content)
                .ok_or_else(|| {
                    AppError::Ai(format!("{} returned no text.", provider.display_name()))
                })?
        }
    };
    if content.trim().is_empty() {
        return Err(AppError::Ai(format!(
            "{} returned an empty message.",
            provider.display_name()
        )));
    }
    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_urls_require_https_except_on_loopback() {
        assert!(normalize_base_url(AiProvider::Custom, Some("https://ai.example.com/v1/")).is_ok());
        assert!(normalize_base_url(AiProvider::Ollama, Some("http://localhost:11434")).is_ok());
        assert!(normalize_base_url(AiProvider::Custom, Some("http://ai.example.com/v1")).is_err());
        assert!(
            normalize_base_url(AiProvider::Custom, Some("https://key@ai.example.com/v1")).is_err()
        );
        assert!(normalize_base_url(AiProvider::OpenAi, Some("https://ai.example.com/v1")).is_err());
        assert!(
            normalize_base_url(AiProvider::Ollama, Some("https://ollama.example.com")).is_err()
        );
    }

    #[test]
    fn known_providers_have_safe_defaults() {
        assert_eq!(
            normalize_base_url(AiProvider::OpenRouter, None).unwrap(),
            "https://openrouter.ai/api/v1"
        );
        assert_eq!(
            normalize_base_url(AiProvider::Ollama, None).unwrap(),
            "http://127.0.0.1:11434"
        );
    }
}
