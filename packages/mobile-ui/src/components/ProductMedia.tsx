import { useEffect, useState } from "react";
import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { palette } from "../tokens/colors";
import { radii } from "../tokens/layout";
import { resolveProductMedia } from "./productMediaModel";

export interface ProductMediaAsset {
  readonly url: string;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly alt?: string | null;
  readonly blurhash?: string | null;
}

export interface ProductMediaProps {
  readonly media?: ProductMediaAsset | null;
  readonly fallbackSource: ImageSourcePropType;
  readonly aspectRatio?: number;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly imageStyle?: StyleProp<ImageStyle>;
  readonly testID?: string;
}

/**
 * Stable media frame with a semantic local fallback. A failed remote image is
 * never rendered as a broken-image glyph and never changes the card's height.
 */
export function ProductMedia({
  media,
  fallbackSource,
  aspectRatio = 4 / 3,
  accessibilityLabel,
  style,
  imageStyle,
  testID,
}: ProductMediaProps) {
  const [failed, setFailed] = useState(false);
  const { uri, showRemote, label } = resolveProductMedia({
    url: media?.url,
    alt: media?.alt,
    failed,
    accessibilityLabel,
  });

  useEffect(() => setFailed(false), [uri]);

  return (
    <View
      testID={testID}
      style={[
        {
          width: "100%",
          aspectRatio,
          overflow: "hidden",
          borderRadius: radii.md,
          backgroundColor: palette.cream,
        },
        style,
      ]}
    >
      <Image
        source={showRemote ? { uri: uri ?? undefined } : fallbackSource}
        resizeMode="cover"
        accessible={showRemote && Boolean(label)}
        accessibilityLabel={showRemote ? label : undefined}
        onError={showRemote ? () => setFailed(true) : undefined}
        style={[{ width: "100%", height: "100%" }, imageStyle]}
      />
    </View>
  );
}
