import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import type { Segment } from '@/state/types';

/** Renders stored rich text, bolding names and items in ink. */
export function SegmentsText({ segments, size = 14, muted }: { segments: Segment[]; size?: number; muted?: boolean }) {
  return (
    <Text size={size} muted={muted} style={{ lineHeight: size * 1.4 }}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={index} weight="bold" size={size} color={Palette.ink}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}
