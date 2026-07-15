/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * build-gallery.ts — renders ALL 30 Sentinel emails (HTML + plain-text) plus an
 * `index.html` contact sheet into this folder, so every notification can be
 * eyeballed in a browser AND forwarded to real Outlook / Gmail / Apple Mail for
 * the cross-client litmus pass (go-live gating item #1 — string assertions can't
 * catch forced inversion / VML quirks / emoji-flag degradation).
 *
 * Lives in mockups/ (outside the Sentinel build) so it never bundles. Regenerate:
 *   tsc --rootDir X:\Source --outDir <tmp> --module commonjs --target ES2017 \
 *       --moduleResolution node --skipLibCheck --esModuleInterop \
 *       --useDefineForClassFields false  mockups/sentinel-emails/build-gallery.ts
 *   node <tmp>/CoreTenantSecurity/mockups/sentinel-emails/build-gallery.js
 *
 * NOTE: one "fat" superset finding feeds every leaf (each reads only its own
 * fields) — the gallery exercises LAYOUT/RENDERING, not realistic per-event copy.
 */

declare const require: any;
declare const process: any;
const fs: any = require("fs");

import { getCoreUtils } from "../../../Admin/kReusableCoreTS/kCoreHandler";
import { kEmailHTML } from "../../../Admin/kReusableCoreTS/kEmailHTML";
import { kLangateEmail } from "../../../Admin/kReusableCoreTS/kLangateEmail";
import { SentinelEmailFactory } from "../../Sentinel/notify/SentinelEmailFactory";

class EmailGalleryBuilder {

    private _OutDir: string = "X:\\Source\\CoreTenantSecurity\\mockups\\sentinel-emails";

    public Build = (): void => {
        if (getCoreUtils().kErrorMode) { return; }
        try {
            kLangateEmail.Configure(
                "https://contoso.sharepoint.com/sites/security/SitePages/CTS.aspx",
                "https://contoso.sharepoint.com/sites/security/SitePages/CTS.aspx?cts_manage=1",
                "langate.se", "Europe/Stockholm");
            if (fs.existsSync(this._OutDir) === false) { fs.mkdirSync(this._OutDir, { recursive: true }); }
            const Cells: string[] = [];
            for (const Kind of SentinelEmailFactory.Kinds) {
                const Cell: string = this._One(Kind);
                if (Cell !== "") { Cells.push(Cell); }
            }
            fs.writeFileSync(this._OutDir + "\\index.html", this._Index(Cells.join("\n")), "utf8");
            console.log("Gallery: " + String(Cells.length) + " emails -> " + this._OutDir + "\\index.html");
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder.Build");
        }
    };

    private _One = (Kind: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            const Email: kEmailHTML | null = SentinelEmailFactory.For(Kind, EmailGalleryBuilder.Fat);
            if (Email === null) { return ""; }
            const Html: string = Email.Render();
            const Text: string = Email.ToPlainText();
            const Row = Email.ToNotificationRow("https://dash", "email", false);
            fs.writeFileSync(this._OutDir + "\\" + Kind + ".html", Html, "utf8");
            fs.writeFileSync(this._OutDir + "\\" + Kind + ".txt", Text, "utf8");
            return this._Cell(Kind, Row.Severity, Row.Title);
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._One");
            return "";
        }
    };

    private _Cell = (Kind: string, Sev: string, Title: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            return "<figure class=\"cell sev-" + Sev + "\">" +
                "<figcaption><span class=\"pill\">" + Sev.toUpperCase() + "</span>" +
                "<code>" + kEmailHTML.Escape(Kind) + "</code></figcaption>" +
                "<div class=\"title\">" + kEmailHTML.Escape(Title) + "</div>" +
                "<div class=\"frame\"><iframe loading=\"lazy\" src=\"" + Kind + ".html\"></iframe></div>" +
                "<div class=\"links\"><a href=\"" + Kind + ".html\">open html</a> &middot; " +
                "<a href=\"" + Kind + ".txt\">text</a></div></figure>";
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._Cell");
            return "";
        }
    };

    private _Index = (Cells: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            return EmailGalleryBuilder._IndexTop.split("{{CELLS}}").join(Cells);
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._Index");
            return "";
        }
    };

    private static _IndexTop: string =
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<title>CTS Sentinel — email gallery (all 30)</title><style>" +
        "body{margin:0;background:#0a141c;color:#e7eef2;font-family:'DM Sans',Segoe UI,Helvetica,Arial,sans-serif;}" +
        "header{padding:22px 26px;border-bottom:1px solid #1d3340;}" +
        "h1{margin:0;font-size:18px;font-weight:800;letter-spacing:.02em;}" +
        "header p{margin:6px 0 0;color:#9fb2bd;font-size:13px;max-width:70ch;}" +
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:22px;padding:24px 26px;}" +
        ".cell{margin:0;background:#0f2333;border:1px solid #1d3340;border-radius:12px;overflow:hidden;}" +
        "figcaption{display:flex;align-items:center;gap:8px;padding:10px 12px;font-size:12px;color:#9fb2bd;}" +
        "figcaption code{font-family:'DM Mono',Consolas,monospace;}" +
        ".pill{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:9px;color:#fff;}" +
        ".sev-critical .pill{background:#B33F3E;}.sev-high .pill{background:#d98324;}" +
        ".sev-medium .pill{background:#0b6e5c;}.sev-info .pill{background:#3a6b82;}" +
        ".sev-critical{border-color:#5e2b2a;}.sev-high{border-color:#5e451f;}" +
        ".title{padding:0 12px 10px;font-size:13px;font-weight:700;color:#fff;}" +
        ".frame{height:300px;overflow:hidden;background:#061520;border-top:1px solid #1d3340;}" +
        ".frame iframe{width:600px;height:900px;border:0;transform:scale(.5);transform-origin:top left;}" +
        ".links{padding:9px 12px;font-size:12px;}" +
        ".links a{color:#8fb6c0;text-decoration:none;}.links a:hover{text-decoration:underline;}" +
        "</style></head><body><header><h1>CTS Sentinel — notification email gallery</h1>" +
        "<p>All 30 notification types, rendered by the actual code (one superset finding feeds " +
        "every leaf). Open any one and forward it to a real Outlook / Gmail / Apple Mail account " +
        "for the cross-client litmus pass. Generated by build-gallery.ts.</p></header>" +
        "<div class=\"grid\">{{CELLS}}</div></body></html>";

    public static Fat: any = {
        SourceIp: "185.220.101.47", SourceFlag: "🇳🇱", LandedUpn: "jordan.lee@langate.se",
        FailedCount: 5, WindowLabel: "47 min", AppDisplay: "Office 365 Exchange",
        ClientApp: "Other clients (legacy)", WhenIso: "2026-06-18T09:14:00Z", DedupKey: "fixture-dedup",
        Upn: "omar.reyes@langate.se", FromCity: "Stockholm", FromCountry: "Sweden", FromFlag: "🇸🇪",
        ToCity: "Tokyo", ToCountry: "Japan", ToFlag: "🇯🇵", DistanceKm: 8190, ImpliedSpeedKmh: 16380,
        ElapsedLabel: "30 min", ToIp: "203.0.113.9", ToDevice: "Windows 11",
        TopTargets: "5 accounts", LocationLabel: "Amsterdam, NL",
        RiskLevel: "high", RiskState: "atRisk", RiskEventTypes: "unfamiliarFeatures",
        Ip: "198.51.100.7", City: "Dallas", Country: "United States", Flag: "🇺🇸", App: "Azure Portal",
        NewCountry: "Brazil", NewFlag: "🇧🇷", BaselineCountries: "Sweden, Germany",
        AnomalyTags: "new device, new app, off-hours", TagCount: 3, Protocol: "IMAP4",
        FeedVerdict: "Tor exit node", Method: "Microsoft Authenticator",
        CurrentRateLabel: "62%", BaselineRateLabel: "8%", TopIps: "3 IPs", TopApps: "Exchange",
        ContributingDetections: "leaked credentials", PriorState: "atRisk", Trigger: "admin confirmation",
        DetectionType: "Leaked credentials", DetectionId: "det-99",
        IncidentId: "inc-901", IncidentTitle: "Multi-stage incident", SeverityLabel: "High",
        AlertCount: 4, ImpactedUsers: "3 users", MitreTechniques: "T1078, T1110", Classification: "TruePositive",
        IncidentWebUrl: "https://security.microsoft.com/incidents/inc-901",
        OldSeverity: "Medium", NewSeverity: "High", WhatChanged: "new alerts",
        AlertId: "alert-1", AlertTitle: "Suspicious inbox rule", Category: "Credential access",
        Entities: "user, mailbox", AlertWebUrl: "https://security.microsoft.com/alerts/alert-1",
        Assignee: "peter@langate.se", AgeLabel: "3 days", IsUnassigned: false,
        AppName: "Contoso Add-in", ScopesGranted: "Mail.Read", ConsentedBy: "jane@langate.se",
        ServicePrincipalId: "sp-1", RoleName: "Global Administrator", PrincipalUpn: "mallory@langate.se",
        AssignedBy: "admin@langate.se", PolicyName: "Require MFA", ChangeType: "modified",
        Actor: "admin@langate.se", CredentialType: "client secret", MethodRemoved: "Authenticator",
        WhatDisabled: "Security defaults", DomainName: "partner.example.com", ResetCount: 42,
        FeedSource: "Tor exit list", AffectedUsers: "2 users", Asn: "AS12345", Isp: "Example ISP",
        FirstSeenLabel: "today 09:14", AlarmType: "IDS/IPS signature", DeviceLabel: "UDM-Pro",
        SourceLabel: "192.0.2.5", Condition: "Missed run", Detail: "no poll in 20 min",
        PeriodLabel: "18 Jun 2026", Attempts: 12788, Failed: 412, RiskyUsers: 6, NewIncidents: 3,
        LegacyAuthSuccesses: 18, CaGaps: 2,
        Sections: [{ Heading: "Top risks", Lines: ["omar.reyes@langate.se", "kara.ellis@langate.se"] }]
    };
}

new EmailGalleryBuilder().Build();
process.exit(0);
