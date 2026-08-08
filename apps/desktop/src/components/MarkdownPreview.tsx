import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
	content: string;
	className?: string;
}

type ReferenceMap = Map<string, string>;

function headingId(text: string): string {
	const version = text.match(/^\[([^\]]+)]/);
	if (version) return `version-${version[1].toLowerCase()}`;
	return text
		.toLowerCase()
		.replace(/\[|]|\*|`/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function renderInline(text: string, references: ReferenceMap): ReactNode[] {
	const nodes: ReactNode[] = [];
	const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+]\([^)]+\)|\[[^\]]+])/g;
	let cursor = 0;
	let match = pattern.exec(text);

	while (match) {
		if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
		const token = match[0];
		const key = `${match.index}-${token}`;

		if (token.startsWith("**")) {
			nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
		} else if (token.startsWith("`")) {
			nodes.push(
				<code
					key={key}
					className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
				>
					{token.slice(1, -1)}
				</code>,
			);
		} else {
			const inlineLink = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
			const label = inlineLink?.[1] ?? token.slice(1, -1);
			const href = inlineLink?.[2] ?? references.get(label.toLowerCase());
			nodes.push(
				href ? (
					<a
						key={key}
						href={href}
						target="_blank"
						rel="noreferrer"
						className="font-medium text-brand underline decoration-brand/35 underline-offset-2 hover:decoration-brand"
					>
						{label}
					</a>
				) : (
					<span key={key}>{token}</span>
				),
			);
		}

		cursor = match.index + token.length;
		match = pattern.exec(text);
	}

	if (cursor < text.length) nodes.push(text.slice(cursor));
	return nodes;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
	const lines = content.split(/\r?\n/);
	const references: ReferenceMap = new Map();

	for (const line of lines) {
		const reference = line.match(/^\[([^\]]+)]:\s+(\S+)$/);
		if (reference) references.set(reference[1].toLowerCase(), reference[2]);
	}

	const blocks: ReactNode[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		if (!line.trim() || /^\[[^\]]+]:\s+\S+$/.test(line)) {
			index += 1;
			continue;
		}

		const heading = line.match(/^(#{1,3})\s+(.+)$/);
		if (heading) {
			const level = heading[1].length;
			const text = heading[2];
			const id = headingId(text);
			const headingClass =
				level === 1
					? "mb-5 border-b border-border/70 pb-4 text-2xl font-semibold tracking-[-0.035em]"
					: level === 2
						? "mb-4 mt-10 scroll-mt-6 border-b border-border/70 pb-2.5 text-lg font-semibold tracking-[-0.025em] first:mt-0"
						: "mb-3 mt-6 text-[13px] font-semibold";
			const children = renderInline(text, references);
			blocks.push(
				level === 1 ? (
					<h1 id={id} key={`${index}-${id}`} className={headingClass}>
						{children}
					</h1>
				) : level === 2 ? (
					<h2 id={id} key={`${index}-${id}`} className={headingClass}>
						{children}
					</h2>
				) : (
					<h3 id={id} key={`${index}-${id}`} className={headingClass}>
						{children}
					</h3>
				),
			);
			index += 1;
			continue;
		}

		if (line.startsWith("- ")) {
			const items: string[] = [];
			while (index < lines.length && lines[index].startsWith("- ")) {
				items.push(lines[index].slice(2));
				index += 1;
			}
			blocks.push(
				<ul
					key={`list-${index}`}
					className="mb-5 list-disc space-y-2 pl-5 text-[13px] leading-[1.45rem] text-foreground/85 marker:text-muted-foreground"
				>
					{items.map((item, itemIndex) => (
						<li key={`${itemIndex}-${item}`}>
							{renderInline(item, references)}
						</li>
					))}
				</ul>,
			);
			continue;
		}

		const paragraph: string[] = [];
		while (
			index < lines.length &&
			lines[index].trim() &&
			!/^#{1,3}\s+/.test(lines[index]) &&
			!lines[index].startsWith("- ") &&
			!/^\[[^\]]+]:\s+\S+$/.test(lines[index])
		) {
			paragraph.push(lines[index].trim());
			index += 1;
		}
		blocks.push(
			<p
				key={`paragraph-${index}`}
				className="mb-4 text-[13px] leading-6 text-foreground/80"
			>
				{renderInline(paragraph.join(" "), references)}
			</p>,
		);
	}

	return <article className={cn("select-text", className)}>{blocks}</article>;
}
