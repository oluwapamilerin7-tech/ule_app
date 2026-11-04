import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';

// iOS tells us before the keyboard moves; Android only after.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
/** Breathing room between the focused field and the top of the keyboard. */
const GAP = 16;

const FocusContext = createContext<((input: TextInputInstance | null) => void) | null>(null);

/** Lets a scroll area made with `useKeyboardSpace` see which of its fields has focus. */
export const KeyboardFocusProvider = FocusContext.Provider;

/** Used by TextField: report focus so the surrounding scroll area can bring the field into view. */
export function useKeyboardFocus() {
  return useContext(FocusContext);
}

/**
 * Keeps whatever the keyboard covers reachable. Android apps now draw edge to edge, so the
 * window no longer shrinks for the keyboard; instead we measure how much of `areaRef` the
 * keyboard overlaps, pad the area by that much (so its ScrollView ends at the keyboard), and
 * scroll the focused field into view. Where the window does shrink, the overlap is just 0.
 *
 *   const { areaRef, scrollRef, space, onFocus, onScroll } = useKeyboardSpace();
 *   <View ref={areaRef} style={{ flex: 1, paddingBottom: space }}>
 *     <KeyboardFocusProvider value={onFocus}>
 *       <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}>…</ScrollView>
 */
export function useKeyboardSpace() {
  const areaRef = useRef<ViewInstance>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const focused = useRef<TextInputInstance | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const [space, setSpace] = useState(0);

  const reveal = useCallback(() => {
    const input = focused.current;
    const top = keyboardTop.current;
    if (!input || top === null || !input.isFocused()) return;
    input.measureInWindow((_x, y, _width, height) => {
      const hidden = y + height + GAP - top;
      if (hidden > 0) scrollRef.current?.scrollTo({ y: offset.current + hidden, animated: true });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (event: KeyboardEvent) => {
      const top = event.endCoordinates.screenY;
      keyboardTop.current = top;
      areaRef.current?.measureInWindow((_x, y, _width, height) => {
        setSpace(Math.max(0, Math.round(y + height - top)));
        // Wait for the padding to lay out before measuring the field.
        setTimeout(reveal, 150);
      });
    });
    const hide = Keyboard.addListener(HIDE, () => {
      keyboardTop.current = null;
      setSpace(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  const onFocus = useCallback(
    (input: TextInputInstance | null) => {
      focused.current = input;
      // Moving to another field while the keyboard is already up.
      if (keyboardTop.current !== null) setTimeout(reveal, 50);
    },
    [reveal],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { areaRef, scrollRef, space, onFocus, onScroll };
}
