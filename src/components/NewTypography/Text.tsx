import styled from 'styled-components';
import {
  color,
  ColorProps,
  colorStyle,
  ColorStyleProps,
  fontStyle,
  FontStyleProps,
  layout,
  LayoutProps,
  lineHeight,
  LineHeightProps,
  size,
  SizeProps,
  space,
  SpaceProps,
  textStyle,
  TextStyleProps,
  typography,
  TypographyProps
} from 'styled-system';

import { textVariants, TextVariants } from '@theme';

export type TextProps = SpaceProps &
  LineHeightProps &
  FontStyleProps &
  SizeProps &
  ColorProps &
  ColorStyleProps &
  TextStyleProps &
  LayoutProps &
  TypographyProps & {
    variant?: TextVariants;
    as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  } & {
    textTransform?: 'uppercase' | 'capitalize' | 'lowercase';
  };

const Text: React.FC<TextProps> = styled.p<TextProps>`
  ${textVariants}
  ${space}
  ${fontStyle}
  ${color}
  ${size}
  ${colorStyle}
  ${textStyle}
  ${lineHeight}
  ${typography}
  ${layout}
  ${({ textTransform }) => textTransform && { 'text-transform': textTransform }}
`;

export default Text;
