import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Copy, Scissors } from "lucide-react";

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

interface MenuState {
	x: number;
	y: number;
	target: EditableElement | null;
	editable: boolean;
	hasSelection: boolean;
}

const labels = navigator.language.toLowerCase().startsWith("tr")
	? { cut: "Kes", copy: "Kopyala", paste: "Yapıştır", selectAll: "Tümünü seç" }
	: { cut: "Cut", copy: "Copy", paste: "Paste", selectAll: "Select all" };

function editableTarget(target: EventTarget | null): EditableElement | null {
	if (!(target instanceof HTMLElement)) return null;
	const candidate = target.closest<HTMLElement>("input, textarea, [contenteditable='true']");
	if (candidate instanceof HTMLInputElement && candidate.disabled) return null;
	if (candidate instanceof HTMLTextAreaElement && candidate.disabled) return null;
	return candidate;
}

function selectionExists(target: EditableElement | null) {
	if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
		return (target.selectionEnd ?? 0) > (target.selectionStart ?? 0);
	}
	return Boolean(window.getSelection()?.toString());
}

export function ContextMenu() {
	const [menu, setMenu] = useState<MenuState | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const open = (event: MouseEvent) => {
			event.preventDefault();
			const target = editableTarget(event.target);
			setMenu({
				x: event.clientX,
				y: event.clientY,
				target,
				editable: target !== null,
				hasSelection: selectionExists(target),
			});
		};
		const close = () => setMenu(null);
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};

		document.addEventListener("contextmenu", open);
		document.addEventListener("pointerdown", close);
		window.addEventListener("blur", close);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("contextmenu", open);
			document.removeEventListener("pointerdown", close);
			window.removeEventListener("blur", close);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, []);

	useEffect(() => {
		if (!menu || !menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		setMenu((current) =>
			current
				? {
						...current,
						x: Math.min(current.x, window.innerWidth - rect.width - 8),
						y: Math.min(current.y, window.innerHeight - rect.height - 8),
					}
				: null,
		);
	}, [menu?.x, menu?.y]);

	if (!menu) return null;

	const run = async (command: "cut" | "copy" | "paste" | "selectAll") => {
		menu.target?.focus();
		if (command === "paste") {
			try {
				const text = await navigator.clipboard.readText();
				document.execCommand("insertText", false, text);
			} catch {
				// Clipboard access can be denied by the OS; leave the field unchanged.
			}
		} else {
			document.execCommand(command);
		}
		setMenu(null);
	};

	const items = [
		{ command: "cut" as const, label: labels.cut, icon: Scissors, show: menu.editable, enabled: menu.hasSelection },
		{ command: "copy" as const, label: labels.copy, icon: Copy, show: true, enabled: menu.hasSelection },
		{ command: "paste" as const, label: labels.paste, icon: Clipboard, show: menu.editable, enabled: true },
		{ command: "selectAll" as const, label: labels.selectAll, icon: Check, show: true, enabled: true },
	];

	return (
		<div
			ref={menuRef}
			role="menu"
			className="fixed z-[1000] min-w-44 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
			style={{ left: Math.max(8, menu.x), top: Math.max(8, menu.y) }}
			onPointerDown={(event) => event.stopPropagation()}
		>
			{items.filter((item) => item.show).map(({ command, label, icon: Icon, enabled }) => (
				<button
					key={command}
					type="button"
					role="menuitem"
					disabled={!enabled}
					className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
					onClick={() => void run(command)}
				>
					<Icon className="size-4 text-muted-foreground" />
					{label}
				</button>
			))}
		</div>
	);
}
