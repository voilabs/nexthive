export type AiProvider =
	| "openai"
	| "openrouter"
	| "claude"
	| "ollama"
	| "custom";

/** Public metadata only. API keys never come back from Rust. */
export interface AiProviderAccount {
	id: number;
	provider: AiProvider;
	label: string;
	baseUrl: string;
	model: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateAiProviderAccountInput {
	provider: AiProvider;
	label: string;
	baseUrl?: string | null;
	model: string;
	apiKey?: string | null;
}

export interface AiConnectionTestResult {
	success: boolean;
	message: string;
	sample: string | null;
}
