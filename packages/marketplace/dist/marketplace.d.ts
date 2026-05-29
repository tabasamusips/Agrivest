import { Queryable } from "@agrivest/ledger";
/** Apply the marketplace schema. Run AFTER the ledger schema (it reads ledger tables). */
export declare function migrateMarketplace(db: Queryable): Promise<void>;
export interface ProjectInput {
    id: string;
    sponsorId: string;
    title: string;
    venture: string;
    location: string;
    returnModel: string;
    cycleMonths: number;
    minCents: number;
    targetCents: number;
    blurb?: string;
}
export interface ApproveTerms {
    grade: string;
    expectedPct: number;
    downsidePct: number;
    closesAt?: Date;
}
export interface Funding {
    raisedCents: number;
    targetCents: number;
    fundedPct: number;
    investors: number;
}
/**
 * The marketplace catalogue. Funding numbers are read live from the ledger:
 * `raised` = the project's escrow balance, `investors` = active investments.
 */
export declare class MarketplaceService {
    private db;
    constructor(db: Queryable);
    createSponsor(id: string, name: string): Promise<{
        rows: any[];
    }>;
    /** Sponsor submits a venture; it enters underwriting (not yet investable). */
    submitProject(p: ProjectInput): Promise<{
        rows: any[];
    }>;
    /** Underwriting outcome: grade + return terms, open for funding. */
    approveProject(id: string, t: ApproveTerms): Promise<{
        rows: any[];
    }>;
    fundingProgress(projectId: string): Promise<Funding>;
    /** Catalogue with live funding, newest first. */
    listProjects(): Promise<any[]>;
    getProject(id: string): Promise<any>;
    postUpdate(projectId: string, body: string, hasPhoto?: boolean): Promise<{
        rows: any[];
    }>;
    /** Flip to 'active' once the raise is fully funded. */
    markFundedIfComplete(projectId: string): Promise<boolean>;
}
