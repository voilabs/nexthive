import {
	Bot,
	Cloud,
	Cpu,
	type LucideIcon,
	Network,
	Settings2,
} from "lucide-react";
import type { AiProvider } from "@/types";

export interface AiProviderDefinition {
	id: AiProvider;
	name: string;
	shortDescription: string;
	detailDescription: string;
	defaultBaseUrl: string;
	defaultModel: string;
	requiresApiKey: boolean;
	local: boolean;
	modelHint: string;
	icon: LucideIcon;
}

export const AI_PROVIDERS: AiProviderDefinition[] = [
	{
		id: "openrouter",
		name: "OpenRouter",
		shortDescription: "Hundreds of models, including a zero-cost router",
		detailDescription:
			"Use OpenRouter's unified API. The openrouter/free model routes commit messages to a currently available free model.",
		defaultBaseUrl: "https://openrouter.ai/api/v1",
		defaultModel: "openrouter/free",
		requiresApiKey: true,
		local: false,
		modelHint: "openrouter/free or any OpenRouter model slug",
		icon: Network,
	},
	{
		id: "ollama",
		name: "Ollama",
		shortDescription: "Run free models completely on this computer",
		detailDescription:
			"Connect to a local Ollama server. Requests and repository-relative filenames stay on your machine and no API key is required.",
		defaultBaseUrl: "http://127.0.0.1:11434",
		defaultModel: "qwen3:4b",
		requiresApiKey: false,
		local: true,
		modelHint: "For example qwen3:4b, gemma3:4b or another installed model",
		icon: Cpu,
	},
	{
		id: "openai",
		name: "OpenAI",
		shortDescription: "OpenAI models through the official API",
		detailDescription:
			"Generate concise backup commit messages through OpenAI. NextHive sends metadata only, never file contents.",
		defaultBaseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-5-nano",
		requiresApiKey: true,
		local: false,
		modelHint: "Any chat-completions compatible OpenAI model",
		icon: Bot,
	},
	{
		id: "claude",
		name: "Anthropic Claude",
		shortDescription: "Claude models through the Messages API",
		detailDescription:
			"Use Anthropic's native Messages API for short, evidence-based commit summaries.",
		defaultBaseUrl: "https://api.anthropic.com",
		defaultModel: "claude-haiku-4-5",
		requiresApiKey: true,
		local: false,
		modelHint: "A Claude model available to your Anthropic account",
		icon: Cloud,
	},
	{
		id: "custom",
		name: "Custom AI endpoint",
		shortDescription: "LM Studio, LocalAI, vLLM, Groq and compatible APIs",
		detailDescription:
			"Connect any OpenAI chat-completions compatible endpoint. HTTPS is required except for localhost; API keys are optional.",
		defaultBaseUrl: "http://127.0.0.1:1234/v1",
		defaultModel: "local-model",
		requiresApiKey: false,
		local: false,
		modelHint: "Use the exact model identifier exposed by your endpoint",
		icon: Settings2,
	},
];

export function isAiProvider(value: string | undefined): value is AiProvider {
	return AI_PROVIDERS.some((provider) => provider.id === value);
}

export function getAiProvider(provider: AiProvider): AiProviderDefinition {
	return AI_PROVIDERS.find((item) => item.id === provider) ?? AI_PROVIDERS[0];
}
