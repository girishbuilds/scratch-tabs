import React, { useState } from "react";
import { parseImageDataUri } from "../../../formats/image/utils/dataUri";
import { formatBytes } from "../../../utils/formatBytes";

interface ImagePastePreviewProps {
  dataUrl: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const describeImage = (
  dataUrl: string,
  dimensions: ImageDimensions | null,
): string => {
  const parsed = parseImageDataUri(dataUrl);
  return [
    dimensions && `${dimensions.width}×${dimensions.height}`,
    parsed?.mediaSubtype.toUpperCase(),
    parsed && formatBytes(parsed.decodedBytes),
  ]
    .filter(Boolean)
    .join(" · ");
};

export const ImagePastePreview: React.FC<ImagePastePreviewProps> = ({
  dataUrl,
}) => {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);

  return (
    <figure
      className="mt-4 flex flex-col items-center gap-2"
      data-testid="paste-image-preview"
    >
      <div className="flex max-h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-base bg-element p-2">
        <img
          src={dataUrl}
          alt="Pasted image preview"
          className="max-h-44 max-w-full object-contain"
          onLoad={(e) =>
            setDimensions({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            })
          }
        />
      </div>
      <figcaption
        className="text-xs text-muted"
        data-testid="paste-image-preview-meta"
      >
        {describeImage(dataUrl, dimensions)}
      </figcaption>
    </figure>
  );
};
