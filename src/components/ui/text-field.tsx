import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { FontFamily, Palette } from '@/constants/theme';

import { Icon } from './icon';
import { useKeyboardFocus } from './keyboard';
import { Text } from './text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Muted suffix after the label, e.g. "(for password reset)". */
  labelNote?: string;
  /** `caps` is the small uppercase label from the New task / New event forms. */
  labelStyle?: 'default' | 'caps';
  labelRight?: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Adds the eye button that reveals the password. */
  password?: boolean;
  prefix?: string;
  height?: number;
  fontSize?: number;
  bold?: boolean;
  /** Greyed, read-only look (e.g. an invite code filled in from a link). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  labelNote,
  labelStyle = 'default',
  labelRight,
  hint,
  error,
  password,
  prefix,
  height = 52,
  fontSize = 16,
  bold,
  filled,
  multiline,
  style,
  onFocus,
  onBlur,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const keyboardFocus = useKeyboardFocus();

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text
            weight="bold"
            size={labelStyle === 'caps' ? 12 : 13}
            color={labelStyle === 'caps' ? Palette.slate : Palette.ink}
            style={labelStyle === 'caps' && styles.caps}>
            {label}
            {labelNote ? (
              <Text weight="medium" size={13} muted>
                {' '}
                {labelNote}
              </Text>
            ) : null}
          </Text>
          {labelRight}
        </View>
      ) : null}
      <View
        style={[
          styles.box,
          multiline ? styles.multiline : { height },
          filled && styles.filled,
          focused && styles.focused,
          !!error && styles.error,
        ]}>
        {prefix ? (
          <Text weight="bold" size={fontSize + 2} muted>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...input}
          ref={inputRef}
          multiline={multiline}
          accessibilityLabel={input.accessibilityLabel ?? label}
          secureTextEntry={password && !revealed}
          placeholderTextColor={Palette.grey}
          selectionColor={Palette.coral}
          onFocus={(event) => {
            setFocused(true);
            keyboardFocus?.(inputRef.current);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              fontSize,
              fontFamily: bold ? FontFamily.semibold : FontFamily.regular,
            },
            multiline && styles.inputMultiline,
          ]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((value) => !value)}
            style={styles.reveal}>
            <Icon name={revealed ? 'eye-off' : 'eye'} size={20} color={Palette.slate} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text weight="semibold" size={12} color={Palette.danger}>
          {error}
        </Text>
      ) : typeof hint === 'string' ? (
        <Text size={12} muted>
          {hint}
        </Text>
      ) : (
        hint
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    backgroundColor: Palette.surface,
    paddingLeft: 14,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  filled: {
    backgroundColor: Palette.muted,
  },
  focused: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  error: {
    borderWidth: 1.5,
    borderColor: Palette.danger,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    color: Palette.ink,
    paddingRight: 14,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 48,
    textAlignVertical: 'top',
  },
  reveal: {
    width: 44,
    height: 44,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
