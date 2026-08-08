import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div className="mb-6 flex items-start justify-between gap-6">
			<div>
				<h1 className="text-[1.45rem] font-semibold tracking-[-0.03em]">
					{title}
				</h1>
				{description ? (
					<p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
		</div>
	);
}
