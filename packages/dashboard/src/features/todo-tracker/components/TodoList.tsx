import { useMemo, useState } from "react";
import type { TodoItem } from "../types/todo.types";
import { Button, Input } from "../../../components/ui";
import { TodoItemCard } from "./TodoItemCard";

type DeadlinePresenceFilter = "any" | "has" | "none";
type UrgencyFilter = "any" | "ge0.8" | "ge0.6" | "ge0.4" | "ge0.2";

function parseTs(value?: string | null): number | null {
	if (!value) return null;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : null;
}

function normalizeUrgency(u?: number): number | null {
	if (!Number.isFinite(u)) return null;
	const n = Number(u);
	return n > 1 ? n / 100 : n;
}

function fileName(filePath: string) {
	const parts = String(filePath ?? "").split("/");
	return parts[parts.length - 1] ?? filePath;
}

export function TodoList(props: {
	todos: TodoItem[];
	onOpen: (filePath: string, line?: number) => void;
	onResolve: (id: string) => void;
	onUpdate: (id: string, patch: Partial<Pick<TodoItem, "text" | "filePath" | "line" | "priority" | "deadlineISO">>) => void;
	onPickFile: () => Promise<string | null>;
}) {
	const [filtersExpanded, setFiltersExpanded] = useState(true);
	const [showResolved, setShowResolved] = useState(false);
	const [query, setQuery] = useState("");
	const [createdFromLocal, setCreatedFromLocal] = useState("");
	const [createdToLocal, setCreatedToLocal] = useState("");
	const [deadlineFromLocal, setDeadlineFromLocal] = useState("");
	const [deadlineToLocal, setDeadlineToLocal] = useState("");
	const [deadlinePresence, setDeadlinePresence] = useState<DeadlinePresenceFilter>("any");
	const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("any");

	function clearFilters() {
		setQuery("");
		setCreatedFromLocal("");
		setCreatedToLocal("");
		setDeadlineFromLocal("");
		setDeadlineToLocal("");
		setDeadlinePresence("any");
		setUrgencyFilter("any");
		setShowResolved(false);
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();

		const createdFromTs = createdFromLocal.trim() ? parseTs(createdFromLocal.trim()) : null;
		const createdToTs = createdToLocal.trim() ? parseTs(createdToLocal.trim()) : null;
		const deadlineFromTs = deadlineFromLocal.trim() ? parseTs(deadlineFromLocal.trim()) : null;
		const deadlineToTs = deadlineToLocal.trim() ? parseTs(deadlineToLocal.trim()) : null;

		const minUrgency =
			urgencyFilter === "ge0.8" ? 0.8 :
			urgencyFilter === "ge0.6" ? 0.6 :
			urgencyFilter === "ge0.4" ? 0.4 :
			urgencyFilter === "ge0.2" ? 0.2 :
			null;

		return props.todos.filter((t) => {
			if (!showResolved && t.status === "resolved") {
				return false;
			}

			// search (text + filename/path)
			if (q) {
				const hayText = String(t.text ?? "").toLowerCase();
				const hayPath = String(t.filePath ?? "").toLowerCase();
				const hayName = fileName(String(t.filePath ?? "")).toLowerCase();
				if (!hayText.includes(q) && !hayPath.includes(q) && !hayName.includes(q)) {
					return false;
				}
			}

			// created range (if todo missing createdAt, don't exclude)
			if (createdFromTs !== null || createdToTs !== null) {
				const c = parseTs(t.createdAt);
				if (c !== null) {
					if (createdFromTs !== null && c < createdFromTs) return false;
					if (createdToTs !== null && c > createdToTs) return false;
				}
			}

			// deadline presence + range
			const dl = parseTs(t.deadlineISO ?? undefined);
			if (deadlinePresence === "has" && dl === null) return false;
			if (deadlinePresence === "none" && dl !== null) return false;

			if (deadlineFromTs !== null || deadlineToTs !== null) {
				// If a deadline range is set, only todos with deadlines can match.
				if (dl === null) return false;
				if (deadlineFromTs !== null && dl < deadlineFromTs) return false;
				if (deadlineToTs !== null && dl > deadlineToTs) return false;
			}

			// urgency presets
			if (minUrgency !== null) {
				const u = normalizeUrgency(t.urgencyScore);
				if (u === null || u < minUrgency) {
					return false;
				}
			}

			return true;
		});
	}, [
		props.todos,
		query,
		createdFromLocal,
		createdToLocal,
		deadlineFromLocal,
		deadlineToLocal,
		deadlinePresence,
		urgencyFilter,
		showResolved,
	]);

	if (props.todos.length === 0) {
		return (
			<div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg p-6 text-sm text-vscode-descriptionForeground">
				No open TODOs. Add comments like <code>// TODO: ...</code> and save.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="text-sm font-semibold text-vscode-editor-fg">Filters</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setFiltersExpanded((v) => !v)}
					>
						{filtersExpanded ? "Hide" : "Show"}
					</Button>
				</div>

				{filtersExpanded ? (
					<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Input
							label="Search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by todo text or file name"
						/>

						<div className="w-full">
							<label className="block text-sm font-medium text-vscode-foreground mb-1">Status</label>
							<select
								className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
								value={showResolved ? "all" : "open"}
								onChange={(e) => setShowResolved(e.target.value === "all")}
							>
								<option value="open">Open only</option>
								<option value="all">Open + resolved</option>
							</select>
						</div>

						<Input
							label="Created from"
							type="datetime-local"
							value={createdFromLocal}
							onChange={(e) => setCreatedFromLocal(e.target.value)}
						/>

						<Input
							label="Created to"
							type="datetime-local"
							value={createdToLocal}
							onChange={(e) => setCreatedToLocal(e.target.value)}
						/>

						<div className="w-full">
							<label className="block text-sm font-medium text-vscode-foreground mb-1">Deadline</label>
							<select
								className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
								value={deadlinePresence}
								onChange={(e) => setDeadlinePresence(e.target.value as DeadlinePresenceFilter)}
							>
								<option value="any">Any</option>
								<option value="has">Has deadline</option>
								<option value="none">No deadline</option>
							</select>
						</div>

						<Input
							label="Deadline from"
							type="datetime-local"
							value={deadlineFromLocal}
							onChange={(e) => setDeadlineFromLocal(e.target.value)}
						/>

						<Input
							label="Deadline to"
							type="datetime-local"
							value={deadlineToLocal}
							onChange={(e) => setDeadlineToLocal(e.target.value)}
						/>

						<div className="w-full">
							<label className="block text-sm font-medium text-vscode-foreground mb-1">Urgency</label>
							<select
								className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
								value={urgencyFilter}
								onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilter)}
							>
								<option value="any">Any</option>
								<option value="ge0.8">High (≥ 0.8)</option>
								<option value="ge0.6">Medium (≥ 0.6)</option>
								<option value="ge0.4">Low (≥ 0.4)</option>
								<option value="ge0.2">Very Low (≥ 0.2)</option>
							</select>
						</div>
					</div>
				) : null}

				<div className="mt-3 text-sm text-vscode-descriptionForeground">
					<div className="flex items-center justify-between gap-3">
						<div>
							Showing: <b className="text-vscode-editor-fg">{filtered.length}</b> / {props.todos.length}
						</div>
						<Button type="button" variant="outline" size="sm" onClick={clearFilters}>
							Clear filters
						</Button>
					</div>
				</div>
			</div>

			{filtered.length === 0 ? (
				<div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg p-6 text-sm text-vscode-descriptionForeground">
					No TODOs match the current filters.
				</div>
			) : (
				<div className="grid gap-3">
					{filtered.map((todo) => (
						<TodoItemCard
							key={todo.id}
							todo={todo}
							onOpen={props.onOpen}
							onResolve={props.onResolve}
							onUpdate={props.onUpdate}
							onPickFile={props.onPickFile}
						/>
					))}
				</div>
			)}
		</div>
	);
}

