
import React from 'react';
import { useCampaign } from '../CampaignContext';
import { AspectRatio } from '../types';
import { getRatioValue, hexToRgba } from '../constants';

interface AdCanvasProps {
  ratio: AspectRatio;
  isThumbnail?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const AdCanvas: React.FC<AdCanvasProps> = ({ ratio, isThumbnail = false, containerRef }) => {
  const {
    sourceMode,
    backgrounds,
    solidColor,
    blocks,
    uploadedAssets,
    activeAssetId,
    selectedBlockId,
    isDragging,
    handleDragStart,
  } = useCampaign();

  const activeAsset = uploadedAssets.find(a => a.id === activeAssetId);
  const bgUrl = sourceMode === 'ai' ? backgrounds[ratio] : (sourceMode === 'upload' ? activeAsset?.url : '');
  const ratioVal = getRatioValue(ratio);

  return (
    <div
      ref={containerRef}
      className={`bg-white relative grid-background-subtle shadow-xl overflow-hidden ad-canvas-container ${isThumbnail ? 'rounded-2xl border border-neutral-200' : 'rounded-sm'}`}
      style={{
        backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
        backgroundColor: solidColor,
        aspectRatio: `${ratioVal}`,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: isThumbnail ? '650px' : '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        containerType: 'size' as any,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 'auto',
      }}
    >
      {blocks.map(block => {
        // CTABlock uses fixed positioning; text/asset blocks use x/y
        const blockX = block.type === 'cta' ? 50 : block.x;
        const blockY = block.type === 'cta' ? 92 : block.y;
        const blockRotation = block.type === 'cta' ? 0 : block.rotation;

        return (
        <div
          key={block.id}
          onMouseDown={!isThumbnail ? e => handleDragStart(e, block.id) : undefined}
          onTouchStart={!isThumbnail ? e => handleDragStart(e, block.id) : undefined}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${!isThumbnail ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
          style={{
            left: `${blockX}%`,
            top: `${blockY}%`,
            zIndex: selectedBlockId === block.id ? 50 : 10,
            transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <div style={{ transform: `rotate(${blockRotation}deg)`, opacity: block.type === 'asset' ? block.opacity : 1 }}>
            {block.type === 'text' ? (
              <div
                className={`${!isThumbnail && selectedBlockId === block.id ? 'ring-2 ring-indigo-500 rounded-sm' : ''}`}
                style={{
                  fontSize: `calc(${block.fontSize} * 0.12cqmin)`,
                  color: block.color,
                  whiteSpace: 'nowrap',
                  fontWeight: 900,
                  textShadow: block.color === 'white' ? '0 10px 40px rgba(0,0,0,0.4)' : 'none',
                  padding: '0.1em',
                }}
              >
                {block.words.map((w, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    marginRight: i === block.words.length - 1 ? '0' : '0.2em',
                    fontWeight: w.isBold ? 900 : 400,
                    fontStyle: w.isItalic ? 'italic' : 'normal',
                    textDecoration: w.isUnderlined ? 'underline' : 'none',
                    padding: w.isHighlighted ? '0.05em 0.15em' : '0',
                    backgroundColor: w.isHighlighted ? hexToRgba(block.highlightColor || '#4f46e5', block.highlightOpacity ?? 1) : 'transparent',
                    border: w.isCircled ? `0.05em solid ${block.color}` : 'none',
                    borderRadius: w.isCircled ? '50%' : (w.isHighlighted ? '0.1em' : '0'),
                  }}>
                    {w.text}
                  </span>
                ))}
              </div>
            ) : block.type === 'cta' ? (
              <div
                style={{
                  backgroundColor: block.bgColor,
                  color: block.textColor,
                  fontSize: `calc(${block.fontSize} * 0.12cqmin)`,
                  fontWeight: 700,
                  padding: block.style === 'pill' ? '0.4em 1.2em' : '0.4em 0.8em',
                  borderRadius: block.style === 'pill' ? '9999px' : '4px',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                  lineHeight: '1.2',
                }}
              >
                {block.text}
              </div>
            ) : block.type === 'asset' ? (
              <img
                src={block.url}
                alt={block.name}
                className="max-w-[80cqmin] h-auto drop-shadow-2xl pointer-events-none"
                style={{ transform: `scale(${block.scale})` }}
              />
            ) : null}
          </div>
        </div>
        );
      })}
    </div>
  );
};
