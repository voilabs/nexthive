import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { AutomaticProfileRuleForm } from "@/features/automaticProfiles/components/AutomaticProfileRuleDialog";
import { automaticProfilesCopy } from "@/features/automaticProfiles/copy";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useAutomaticProfilesStore } from "@/stores/automaticProfiles";
import { useExcludesStore } from "@/stores/excludes";
import { useIntegrationsStore } from "@/stores/integrations";
import { useS3Store } from "@/stores/s3";
import type { SaveAutomaticProfileRuleInput } from "@/types";

export function AutomaticProfileEditorPage() {
	const { ruleId } = useParams();
	const navigate = useNavigate();
	const { language } = useTranslation();
	const copy = automaticProfilesCopy(language);
	const automaticProfiles = useAutomaticProfilesStore();
	const integrations = useIntegrationsStore();
	const excludes = useExcludesStore();
	const ai = useAiStore();
	const s3 = useS3Store();
	const parsedRuleId = ruleId === undefined ? null : Number(ruleId);
	const rule = parsedRuleId === null
		? null
		: automaticProfiles.rules.find((item) => item.id === parsedRuleId) ?? null;

	useEffect(() => {
		if (!automaticProfiles.hasLoaded) void automaticProfiles.load();
	}, [automaticProfiles.hasLoaded, automaticProfiles.load]);
	useEffect(() => {
		if (!integrations.hasLoaded) void integrations.load();
	}, [integrations.hasLoaded, integrations.load]);
	useEffect(() => {
		if (!excludes.hasLoaded) void excludes.load();
	}, [excludes.hasLoaded, excludes.load]);
	useEffect(() => {
		if (!ai.hasLoaded) void ai.load();
	}, [ai.hasLoaded, ai.load]);
	useEffect(() => {
		if (!s3.loaded) void s3.load();
	}, [s3.loaded, s3.load]);

	const save = async (input: SaveAutomaticProfileRuleInput) => {
		if (parsedRuleId === null) await automaticProfiles.create(input);
		else await automaticProfiles.update(parsedRuleId, input);
	};

	if (parsedRuleId !== null && !automaticProfiles.hasLoaded) {
		return <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
	}

	if (parsedRuleId !== null && (!Number.isInteger(parsedRuleId) || rule === null)) {
		return (
			<div className="mx-auto max-w-xl py-20 text-center">
				<h1 className="text-xl font-semibold">{copy.title}</h1>
				<p className="mt-2 text-sm text-muted-foreground">The requested automatic profile rule could not be found.</p>
				<Link to="/automatic-profiles" className="mt-5 inline-flex text-sm font-medium text-brand hover:underline">{copy.cancel}</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl pb-12">
			<div className="mb-10">
				<Link to="/automatic-profiles" className="mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
					<ArrowLeft className="size-4" />
					{copy.title}
				</Link>
				<h1 className="text-3xl font-semibold tracking-tight text-foreground/90">{rule ? copy.edit : copy.newRule}</h1>
				<p className="mt-2 text-[15px] text-muted-foreground/70 max-w-2xl">{copy.identityDescription}</p>
			</div>

			<AutomaticProfileRuleForm
				rule={rule}
				onSave={save}
				onCancel={() => navigate("/automatic-profiles")}
			/>
		</div>
	);
}
