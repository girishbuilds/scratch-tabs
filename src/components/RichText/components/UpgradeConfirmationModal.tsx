import React, { useEffect, useState } from "react";
import { Code, FileText, ImageIcon, Layers, X } from "../../Icons";
import { ImagePastePreview } from "./ImagePastePreview";
import {
  findImagePasteOptionByShortcut,
  getImagePasteOptions,
  type ImagePasteOptionId,
} from "./imagePasteOptions";

interface UpgradeConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  isCurrentTabEmpty: boolean;
  /** The pasted image, shown as a preview above the options */
  imageDataUrl?: string | null;
  onPasteAsDataUrl: () => void | Promise<void>;
  onPasteInRichText: () => void | Promise<void>;
  onPasteInCanvas: () => void | Promise<void>;
}

export const UpgradeConfirmationModal: React.FC<UpgradeConfirmationModalProps> = ({
  isOpen,
  onCancel,
  isCurrentTabEmpty,
  imageDataUrl,
  onPasteAsDataUrl,
  onPasteInRichText,
  onPasteInCanvas,
}) => {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsWorking(false);
      setError(null);
    }
  }, [isOpen]);

  const options = getImagePasteOptions(isCurrentTabEmpty);
  const optionActions: Record<ImagePasteOptionId, () => void | Promise<void>> = {
    canvas: onPasteInCanvas,
    richText: onPasteInRichText,
    dataUrl: onPasteAsDataUrl,
  };
  const optionIcons = { canvas: Layers, richText: FileText, dataUrl: Code };

  const runAction = async (action: () => void | Promise<void>) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The image could not be pasted.",
      );
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const option = findImagePasteOptionByShortcut(options, event.key);
      if (option) {
        event.preventDefault();
        void runAction(optionActions[option.id]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-base bg-surface p-5 shadow-2xl"
        data-testid="rich-text-upgrade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-paste-options-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center">
            <ImageIcon size={24} className="mr-3 text-info" />
            <div>
              <h3
                id="image-paste-options-title"
                className="text-lg font-semibold text-main"
              >
                Paste image
              </h3>
              <p className="mt-1 text-sm text-secondary">
                How would you like to use this image?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="rounded p-1 text-muted transition-colors hover:bg-element-hover hover:text-main disabled:opacity-50"
            aria-label="Close image paste options"
          >
            <X size={18} />
          </button>
        </div>

        {imageDataUrl && <ImagePastePreview dataUrl={imageDataUrl} />}

        <div className="mt-4 space-y-2">
          {options.map(({ id, title, description, testId, shortcut }, index) => {
            const Icon = optionIcons[id];
            return (
              <button
                key={testId}
                type="button"
                autoFocus={index === 0}
                onClick={() => void runAction(optionActions[id])}
                disabled={isWorking}
                className="flex w-full items-start gap-3 rounded-lg border border-base p-3 text-left transition-colors hover:border-primary/50 hover:bg-element-hover focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                data-testid={testId}
              >
                <Icon size={19} className="mt-0.5 flex-none text-primary" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-main">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {description}
                  </span>
                </span>
                <kbd
                  className="mt-0.5 flex-none rounded border border-base px-1.5 text-xs text-muted"
                  aria-hidden="true"
                >
                  {shortcut}
                </kbd>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted">
          Press 1-3 to choose, Enter for the highlighted option, Esc to cancel.
        </p>

        {error && (
          <p className="mt-3 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
