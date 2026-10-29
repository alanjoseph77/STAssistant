import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { cardGreen, colors, glossGreen } from './theme';

/** White shine across the upper half, which is what makes the green look glossy. */
function Shine({ radius }: { radius: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.04)']}
      style={[s.shine, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
    />
  );
}

export function GlossButton({
  label,
  onPress,
  disabled,
  variant = 'solid',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
}) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btnWrap,
        !outline && s.btnGlow,
        outline && s.btnOutline,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {!outline && (
        <>
          <LinearGradient colors={glossGreen} style={StyleSheet.absoluteFill} />
          <Shine radius={16} />
        </>
      )}
      <Text style={[s.btnText, outline && { color: colors.greenDark, textShadowColor: 'transparent' }]}>{label}</Text>
    </Pressable>
  );
}

export function WatchCard({ children }: { children: ReactNode }) {
  return (
    <View style={s.watchWrap}>
      <LinearGradient colors={cardGreen} style={StyleSheet.absoluteFill} />
      <Shine radius={24} />
      <View style={s.watchBody}>{children}</View>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={s.section}>{children}</Text>;
}

export function ListCard({ children }: { children: ReactNode }) {
  return <View style={s.list}>{children}</View>;
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  right: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[s.item, !last && s.itemDivider]}>
      <Ionicons name={icon} size={22} color={colors.greenDark} />
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle}>{title}</Text>
        <Text style={s.itemSub}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
  btnWrap: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnGlow: { shadowColor: '#0fa65c', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  btnOutline: { borderWidth: 1.5, borderColor: colors.green, backgroundColor: colors.bg },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(5,80,42,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  watchWrap: { borderRadius: 24, overflow: 'hidden', shadowColor: '#0fa65c', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  watchBody: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  section: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, fontWeight: '600', marginTop: 24, marginBottom: 10 },
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  itemSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
