import React from "react";
import { BaseModal } from "./BaseModal";
import { useModalStore } from "../../stores/modalStore";
import { useThemeStore } from "../../stores/themeStore";
import { useAppStats } from "../../hooks/useAppStats";
import { APP_VERSION } from "../../data/releases";

const LOGO_LIGHT = "https://scratchtabs.b-cdn.net/favicon.svg";
const LOGO_DARK = "https://scratchtabs.b-cdn.net/favicon-gray.svg";
import {
  Github,
  Coffee,
  MessageSquare,
  HardDrive,
  Clock,
  FileText,
  Loader2,
} from "../Icons";

const LINKS = {
  github: "https://github.com/girishbuilds/scratch-tabs/issues",
  kofi: "https://ko-fi.com/scratchtabs",
  discord: "https://discord.gg/HwsfpTzMVS",
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, isLoading }) => (
  <div className="flex items-center gap-3 p-3 bg-element rounded-lg border border-base">
    <div className="text-secondary">{icon}</div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-secondary">{label}</span>
      {isLoading ? (
        <Loader2 size={14} className="animate-spin text-secondary" />
      ) : (
        <span className="text-sm font-medium text-main truncate">{value}</span>
      )}
    </div>
  </div>
);

interface LinkButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const LinkButton: React.FC<LinkButtonProps> = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 px-4 py-2.5 bg-element hover:bg-element-hover border border-base rounded-lg transition-colors text-main"
  >
    {icon}
    <span className="text-sm">{label}</span>
  </a>
);

export const AboutModal: React.FC = () => {
  const { isAboutModalOpen, closeAboutModal } = useModalStore();
  const { isDarkMode } = useThemeStore();
  const stats = useAppStats();

  if (!isAboutModalOpen) return null;

  const logoSrc = isDarkMode ? LOGO_DARK : LOGO_LIGHT;

  return (
    <BaseModal
      title="About Scratch Tabs"
      onClose={closeAboutModal}
      maxWidthClass="max-w-md"
    >
      <div className="p-6 space-y-6">
        {/* Header with logo and version */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src={logoSrc}
              alt="Scratch Tabs"
              className="w-10 h-10"
            />
            <div className="text-left">
              <h3 className="text-lg font-semibold text-main">Scratch Tabs</h3>
              <span className="text-xs font-mono text-secondary">
                v{APP_VERSION}
              </span>
            </div>
          </div>
          <p className="text-sm text-secondary mt-3">
            The privacy-first, offline developer workspace.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            icon={<HardDrive size={18} />}
            label="Local Storage"
            value={stats.storageUsedFormatted}
            isLoading={stats.isLoading}
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Member Since"
            value={stats.memberSinceFormatted}
            isLoading={stats.isLoading}
          />
          <StatCard
            icon={<FileText size={18} />}
            label="Tabs Created"
            value={stats.tabsCreatedTotal.toLocaleString()}
            isLoading={stats.isLoading}
          />
        </div>

        {/* Community Links */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-secondary uppercase tracking-wider">
            Community
          </h4>
          <div className="flex flex-col gap-2">
            <LinkButton
              href={LINKS.github}
              icon={<Github size={16} />}
              label="Feedback / Issues"
            />
            <LinkButton
              href={LINKS.discord}
              icon={<MessageSquare size={16} />}
              label="Join Discord"
            />
            <LinkButton
              href={LINKS.kofi}
              icon={<Coffee size={16} />}
              label="Support on Ko-fi"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-base text-center">
          <p className="text-xs text-secondary">
            Your privacy is paramount. Scratch Tabs remains 100% client-side.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
