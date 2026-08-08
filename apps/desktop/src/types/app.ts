/** Application metadata reported by the backend. */
export interface AppInfo {
	name: string;
	version: string;
	tauriVersion: string;
	platform: string;
	arch: string;
	dataDir: string;
	databasePath: string;
	logDir: string;
}

export interface AppSettings {
	launchAtStartup: boolean;
	minimizeToTray: boolean;
	theme: AppTheme;
	language: AppLanguage;
	timeZone: string;
	/** Anonymous daily "one device is alive" ping (version + OS, nothing else). */
	telemetryEnabled: boolean;
}

export type AppTheme = "light" | "dark" | "system";
export type AppLanguage = "system" | (string & {});

export type DatabaseHealthStatus = "healthy" | "needsRepair" | "corrupt";

export interface DatabaseHealthReport {
	status: DatabaseHealthStatus;
	schemaVersion: number;
	expectedSchemaVersion: number;
	integrityOk: boolean;
	foreignKeyViolations: number;
	missingSchemaItems: string[];
	databaseSize: number;
	repairAvailable: boolean;
	message: string;
	checkedAt: string;
}

export interface DatabaseRepairResult {
	before: DatabaseHealthReport;
	after: DatabaseHealthReport;
	backupPath: string;
	repairsApplied: string[];
}

export interface UpdateAppSettingsInput {
	launchAtStartup?: boolean;
	minimizeToTray?: boolean;
	theme?: AppTheme;
	language?: AppLanguage;
	timeZone?: string;
	telemetryEnabled?: boolean;
}

export interface AppUpdate {
	version: string;
	currentVersion: string;
	notes: string | null;
	publishedAt: string | null;
}

export type UpdateProgressEvent =
	| { event: "started"; data: { contentLength: number | null } }
	| { event: "progress"; data: { chunkLength: number } }
	| { event: "finished" };

export type AppUpdateStatus =
	| "idle"
	| "checking"
	| "upToDate"
	| "available"
	| "downloading"
	| "installing"
	| "error";
