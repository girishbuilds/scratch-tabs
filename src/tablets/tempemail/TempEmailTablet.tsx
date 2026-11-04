import React, { useState, useEffect, useCallback } from "react";
import { Tablet, TabletState } from "../types";
import { Mail, RefreshCw, X, Loader2, Copy, Check } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { normalizeMailTimestamp, formatMailTime } from "./emailTime";

interface Email {
  id: string;
  subject: string;
  from: string;
  timestamp: number;
  body?: string;
}

interface TempEmailState extends TabletState {
  type: "tempemail";
  data: {
    emailAddress: string;
    emailToken: string;
    emails: Email[];
    lastChecked: number;
  };
}

interface EmailModalProps {
  email: Email;
  onClose: () => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ email, onClose }) => {
  const theme = useThemeStore((state) => state.theme);

  // State for copy-from feedback
  const [copiedFrom, setCopiedFrom] = useState(false);
  const handleCopyFrom = async () => {
    await navigator.clipboard.writeText(email.from);
    setCopiedFrom(true);
    setTimeout(() => setCopiedFrom(false), 1500);
  };

  // State for copy-body feedback
  const [copiedBody, setCopiedBody] = useState(false);
  const handleCopyBody = async () => {
    await navigator.clipboard.writeText(email.body || "");
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 1500);
  };

  return (
    <div className="fixed inset-8 bg-surface border border-base rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-surface-raised px-4 py-3 border-b border-base">
        <div>
          <h3 className="text-main font-medium">{email.subject}</h3>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-secondary">From: {email.from}</p>
            <button
              onClick={handleCopyFrom}
              className={`p-1 rounded transition-colors ${copiedFrom ? "text-green-400" : "text-secondary hover:bg-element-hover"}`}
              title={copiedFrom ? "Copied!" : "Copy sender address"}
            >
              {copiedFrom ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyBody}
            className={`p-1 rounded transition-colors ${copiedBody ? "text-green-400" : "text-secondary hover:bg-element-hover"}`}
            title={copiedBody ? "Copied!" : "Copy email body"}
          >
            {copiedBody ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={onClose}
            className="text-secondary hover:bg-element-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto custom-scrollbar">
        <div
          className={`prose max-w-none ${theme === "dark" ? "prose-invert" : ""}`}
          dangerouslySetInnerHTML={{ __html: email.body || "" }}
        />
      </div>
    </div>
  );
};

// Separate React component for Email tablet UI
const TempEmailTabletUI: React.FC<{
  state: TempEmailState;
  onChange: (state: TempEmailState) => void;
}> = ({ state, onChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(state.data.emailAddress);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const generateEmail = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        "https://api.guerrillamail.com/ajax.php?f=get_email_address",
      );
      const data = await response.json();

      onChange({
        ...state,
        data: {
          ...state.data,
          emailAddress: data.email_addr,
          emailToken: data.sid_token,
          emails: [],
          lastChecked: Date.now(),
        },
      });
    } catch (err) {
      setError("Failed to generate email address. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const checkEmails = useCallback(async () => {
    if (!state.data.emailToken || isChecking) return;

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${state.data.emailToken}`,
      );
      const data = await response.json();

      if (data.list && Array.isArray(data.list)) {
        // Create a Set of existing email IDs for efficient lookup
        const existingIds = new Set(state.data.emails.map((email) => email.id));

        // Filter out any emails we already have
        const newEmails = data.list
          .filter((email: any) => !existingIds.has(email.mail_id))
          .map((email: any) => ({
            id: email.mail_id,
            subject: email.subject,
            from: email.mail_from,
            timestamp: normalizeMailTimestamp(email.mail_timestamp),
          }));

        // Only update state if we have new emails
        if (newEmails.length > 0) {
          onChange({
            ...state,
            data: {
              ...state.data,
              // Add new emails to the beginning of the list
              emails: [...newEmails, ...state.data.emails],
              lastChecked: Date.now(),
            },
          });
        } else {
          // Just update the last checked timestamp
          onChange({
            ...state,
            data: {
              ...state.data,
              lastChecked: Date.now(),
            },
          });
        }
      }
    } catch (err) {
      setError("Failed to check for new emails. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }, [state.data.emailToken, state.data.emails, isChecking, onChange]);

  const fetchEmailBody = async (emailId: string) => {
    if (!state.data.emailToken) return;

    try {
      const response = await fetch(
        `https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${emailId}&sid_token=${state.data.emailToken}`,
      );
      const data = await response.json();

      const emailWithBody: Email = {
        id: data.mail_id,
        subject: data.subject,
        from: data.mail_from,
        // Keep the time shown in the list so opening a message never changes it
        timestamp:
          state.data.emails.find((e) => e.id === emailId)?.timestamp ??
          normalizeMailTimestamp(data.mail_timestamp),
        body: data.mail_body,
      };

      setSelectedEmail(emailWithBody);
    } catch (err) {
      setError("Failed to fetch email content. Please try again.");
    }
  };

  // Auto-check for new emails every 10 seconds
  useEffect(() => {
    if (!state.data.emailToken) return;

    const interval = setInterval(checkEmails, 10000);
    return () => clearInterval(interval);
  }, [state.data.emailToken, checkEmails]);

  return (
    <div className="h-full bg-canvas flex flex-col">
      {/* Header */}
      <div className="border-b border-base">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="text-secondary" size={24} />
              <h2 className="text-xl font-semibold text-main">
                Temporary Email
              </h2>
            </div>
            {state.data.emailAddress && (
              <button
                onClick={() => checkEmails()}
                disabled={isChecking}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-element hover:bg-element-hover rounded-md transition-colors"
              >
                {isChecking ? (
                  <Loader2 size={16} className="animate-spin text-secondary" />
                ) : (
                  <RefreshCw size={16} className="text-secondary" />
                )}
                <span className="text-main">Check Now</span>
              </button>
            )}
          </div>

          {!state.data.emailAddress ? (
            <button
              onClick={generateEmail}
              disabled={isGenerating}
              className="mt-4 w-full py-3 bg-info-subtle hover:bg-info-subtle/80 text-info rounded-lg transition-colors"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                "Generate Email Address"
              )}
            </button>
          ) : (
            <div className="mt-4 tablet-card">
              <div className="flex items-center justify-between">
                <div className="font-mono text-main break-all flex-1 mr-3">
                  {state.data.emailAddress}
                </div>
                <button
                  onClick={handleCopyEmail}
                  className={`p-2 rounded transition-colors ${
                    copiedEmail
                      ? "text-success bg-success-subtle"
                      : "text-secondary hover:bg-element-hover"
                  }`}
                  title={copiedEmail ? "Copied!" : "Copy email address"}
                >
                  {copiedEmail ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-sm text-danger">{error}</div>}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {state.data.emailAddress ? (
          state.data.emails && state.data.emails.length > 0 ? (
            <div className="divide-y divide-base">
              {state.data.emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => fetchEmailBody(email.id)}
                  className="w-full px-6 py-4 text-left hover:bg-element-hover transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-main font-medium">
                        {email.subject || "(no subject)"}
                      </h3>
                      <p className="text-sm text-secondary mt-1">{email.from}</p>
                    </div>
                    <span className="text-xs text-muted">
                      {formatMailTime(email.timestamp)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary">
              <div className="text-center">
                <Mail size={48} className="mx-auto mb-4 opacity-50" />
                <p>No emails yet</p>
                <p className="text-sm mt-1">
                  Emails will appear here when received
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-secondary">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-4 opacity-50" />
              <p>Generate an email address to start receiving emails</p>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {selectedEmail && (
        <EmailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
};

export const TempEmailTablet: Tablet = {
  id: "tempemail",
  label: "Temporary Email",
  keywords: ["email", "temp", "disposable", "mail", "inbox"],

  createInitialState(): TempEmailState {
    return {
      type: "tempemail",
      data: {
        emailAddress: "",
        emailToken: "",
        emails: [],
        lastChecked: 0,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "tempemail" && parsed.data) {
        return {
          type: "tempemail",
          data: {
            emailAddress: parsed.data.emailAddress || "",
            emailToken: parsed.data.emailToken || "",
            emails: Array.isArray(parsed.data.emails) ? parsed.data.emails : [],
            lastChecked: parsed.data.lastChecked || 0,
          },
        };
      }
    } catch (e) {
      console.error("Failed to parse Email tablet state:", e);
    }
    return this.createInitialState();
  },

  render(state: TempEmailState, onChange) {
    return <TempEmailTabletUI state={state} onChange={onChange} />;
  },
};
