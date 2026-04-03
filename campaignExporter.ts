import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { AspectRatio, CampaignPreset, TextBlock } from './types';
import { applyLayoutForRatio } from './campaignPresets';
import { RATIO_CONFIGS, getRatioValue, hexToRgba } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExportProgress {
  hookIndex: number;
  sizeIndex: number;
  totalHooks: number;
  totalSizes: number;
  totalImages: number;
  completedImages: number;
}

// ─── DOM Builder ─────────────────────────────────────────────────────────────

function buildAdElement(
  width: number,
  height: number,
  bgUrl: string | undefined,
  blocks: TextBlock[],
  cta: CampaignPreset['cta'],
  textColor: 'white' | 'black',
  logo?: CampaignPreset['logo']
): HTMLDivElement {
  const container = document.createElement('div');

  // Container styles
  Object.assign(container.style, {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    backgroundColor: '#111',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ...(bgUrl
      ? {
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
  });

  // ─── CRITICAL font scaling ─────────────────────────────────────────────────
  // Clamp minimum at 90px for wide banners
  const scalingBase = Math.max(Math.min(width, height), 90);

  // ─── Text blocks ──────────────────────────────────────────────────────────
  for (const block of blocks) {
    const effectiveFontSize = (block.fontSize * 0.12 * scalingBase) / 100;

    const textShadow =
      textColor === 'white'
        ? '0 2px 8px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(255,255,255,0.6), 0 4px 20px rgba(255,255,255,0.4)';

    const blockEl = document.createElement('div');
    Object.assign(blockEl.style, {
      position: 'absolute',
      left: `${block.x}%`,
      top: `${block.y}%`,
      transform: `translate(-50%, -50%) rotate(${block.rotation}deg)`,
      display: 'flex',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0',
      textAlign: 'center',
      color: textColor,
      fontSize: `${effectiveFontSize}px`,
      lineHeight: '1.1',
      textShadow,
      whiteSpace: 'nowrap',
    });

    // ─── Per-word spans ──────────────────────────────────────────────────────
    block.words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word.text;

      const isLast = i === block.words.length - 1;

      const spanStyles: Partial<CSSStyleDeclaration> = {
        fontWeight: word.isBold ? '800' : '400',
        fontStyle: word.isItalic ? 'italic' : 'normal',
        textDecoration: word.isUnderlined ? 'underline' : 'none',
        marginRight: isLast ? '0' : '0.2em',
        display: 'inline-block',
      };

      // Highlight background
      if (word.isHighlighted && block.highlightColor) {
        const opacity = block.highlightOpacity ?? 0.85;
        spanStyles.backgroundColor = hexToRgba(block.highlightColor, opacity);
        spanStyles.padding = '0.05em 0.15em';
        spanStyles.borderRadius = '2px';
      }

      // Circle border
      if (word.isCircled) {
        spanStyles.border = `0.06em solid ${textColor}`;
        spanStyles.borderRadius = '50%';
        spanStyles.padding = '0.05em 0.2em';
      }

      Object.assign(span.style, spanStyles);
      blockEl.appendChild(span);
    });

    container.appendChild(blockEl);
  }

  // ─── CTA ──────────────────────────────────────────────────────────────────
  // Skip on wide banners (height <= 100)
  if (height > 100 && cta) {
    const ctaEl = document.createElement('div');

    // CTA colors invert with textColor
    // white variant = white bg + dark text, black variant = dark bg + white text
    const ctaBgColor = textColor === 'white' ? '#ffffff' : '#111827';
    const ctaTextColor = textColor === 'white' ? '#111827' : '#ffffff';

    const ctaFontSize = Math.max((cta.fontSize * scalingBase) / 300, 9);

    Object.assign(ctaEl.style, {
      position: 'absolute',
      bottom: `${Math.max(height * 0.04, 8)}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: ctaBgColor,
      color: ctaTextColor,
      fontSize: `${ctaFontSize}px`,
      fontWeight: '700',
      padding: cta.style === 'pill' ? '0.4em 1.2em' : '0.4em 0.8em',
      borderRadius: cta.style === 'pill' ? '9999px' : '4px',
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
      lineHeight: '1.2',
    });

    ctaEl.textContent = cta.text;
    container.appendChild(ctaEl);
  }

  // ─── Logo ─────────────────────────────────────────────────────────────────
  if (logo?.assetUrl) {
    const img = document.createElement('img');
    img.src = logo.assetUrl;

    const logoSize = Math.min(width, height) * 0.15 * logo.scale;
    const margin = Math.min(width, height) * 0.04;

    const logoStyles: Partial<CSSStyleDeclaration> = {
      position: 'absolute',
      width: `${logoSize}px`,
      height: 'auto',
      opacity: String(logo.opacity),
    };

    if (logo.corner === 'top-left') {
      logoStyles.top = `${margin}px`;
      logoStyles.left = `${margin}px`;
    } else if (logo.corner === 'top-right') {
      logoStyles.top = `${margin}px`;
      logoStyles.right = `${margin}px`;
    } else if (logo.corner === 'bottom-left') {
      logoStyles.bottom = `${margin}px`;
      logoStyles.left = `${margin}px`;
    } else {
      // bottom-right
      logoStyles.bottom = `${margin}px`;
      logoStyles.right = `${margin}px`;
    }

    Object.assign(img.style, logoStyles);
    container.appendChild(img);
  }

  return container;
}

// ─── Parse dimensions from RATIO_CONFIGS ─────────────────────────────────────

function parseDimensions(ratio: AspectRatio): { width: number; height: number } {
  const cfg = RATIO_CONFIGS.find(r => r.value === ratio);
  if (cfg) {
    const parts = cfg.dimensions.split(' x ').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { width: parts[0], height: parts[1] };
    }
  }
  // Fallback: derive from ratio string e.g. "16:9" -> 1600x900
  const ratioVal = getRatioValue(ratio);
  const baseH = 1080;
  return { width: Math.round(baseH * ratioVal), height: baseH };
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportCampaign(
  preset: CampaignPreset,
  backgrounds: Partial<Record<AspectRatio, string>>,
  onProgress: (progress: ExportProgress) => void
): Promise<Blob> {
  const zip = new JSZip();

  const hooks = preset.hooks;
  const sizes = preset.targetSizes;
  const colorVariants: Array<'white' | 'black'> = ['white', 'black'];

  const totalImages = hooks.length * sizes.length * colorVariants.length;
  let completedImages = 0;

  // Create offscreen container
  const offscreenContainer = document.createElement('div');
  Object.assign(offscreenContainer.style, {
    position: 'fixed',
    left: '-9999px',
    top: '-9999px',
    pointerEvents: 'none',
  });
  document.body.appendChild(offscreenContainer);

  try {
    for (let hi = 0; hi < hooks.length; hi++) {
      const hook = hooks[hi];

      // Hook folder naming: hook-${index+1}-${slug}
      const hookSlug = hook.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const hookFolderName = `hook-${hi + 1}-${hookSlug}`;
      const hookFolder = zip.folder(hookFolderName)!;

      for (let si = 0; si < sizes.length; si++) {
        const ratio = sizes[si];
        const { width, height } = parseDimensions(ratio);
        const bgUrl = backgrounds[ratio];

        // pixelRatio: 2 if height > 1000, else 3
        const pixelRatio = height > 1000 ? 2 : 3;

        const adaptedBlocks = applyLayoutForRatio(hook, ratio);

        for (const colorVariant of colorVariants) {
          onProgress({
            hookIndex: hi,
            sizeIndex: si,
            totalHooks: hooks.length,
            totalSizes: sizes.length,
            totalImages,
            completedImages,
          });

          try {
            const adEl = buildAdElement(
              width,
              height,
              bgUrl,
              adaptedBlocks,
              preset.cta,
              colorVariant,
              preset.logo
            );

            // Clear container and append element
            offscreenContainer.textContent = '';
            offscreenContainer.appendChild(adEl);

            // Wait for paint (two rAF frames)
            await new Promise<void>(r =>
              requestAnimationFrame(() => requestAnimationFrame(() => r()))
            );

            // Capture PNG
            const dataUrl = await htmlToImage.toPng(adEl, {
              cacheBust: true,
              quality: 1,
              pixelRatio,
              width,
              height,
            });

            // Extract base64 (strip "data:image/png;base64,")
            const base64 = dataUrl.split(',')[1];

            // Add to ZIP: hookFolder/dimensions_color.png
            const fileName = `${width}x${height}_${colorVariant}.png`;
            hookFolder.file(fileName, base64, { base64: true });
          } catch (err) {
            console.error(
              `[campaignExporter] Failed: hook=${hook.name}, ratio=${ratio}, color=${colorVariant}`,
              err
            );
            // continue — don't abort the batch
          }

          completedImages++;
        }
      }
    }

    // Final progress update
    onProgress({
      hookIndex: hooks.length - 1,
      sizeIndex: sizes.length - 1,
      totalHooks: hooks.length,
      totalSizes: sizes.length,
      totalImages,
      completedImages,
    });

    return await zip.generateAsync({ type: 'blob' });
  } finally {
    // Always clean up offscreen container
    document.body.removeChild(offscreenContainer);
  }
}
