import { useState } from 'react'
import { Image, Share, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, formatDate, visitorApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, Chip, ChipRow, CreateFab, Empty, ErrorText, FadeIn, Field, GlassSheet,
  InkHero, LoadingBlock, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { colors, fonts, radius, space } from '../../src/theme'

export default function GuestsScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('GUEST')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  const list = useQuery({ queryKey: ['visitors'], queryFn: () => visitorApi.list() })

  const create = useMutation({
    mutationFn: () => visitorApi.create({
      flatId: user?.flatId,
      visitorName: name.trim(),
      visitType: type,
      validityMinutes: 120,
    }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setToken(res.qrToken)
      setName('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err) => setError(apiError(err, 'Could not create pass')),
  })

  function closeSheet() {
    setOpen(false)
    setError('')
    if (!token) setName('')
  }

  if (!user?.flatId) {
    return (
      <Screen>
        <SafeAreaView edges={['top']} style={{ flex: 1, padding: space.md }}>
          <InkHero
            compact
            eyebrow="Guests"
            title="Invite locked"
            subtitle="Ask your society admin to assign occupancy to your flat first."
          />
        </SafeAreaView>
      </Screen>
    )
  }

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <InkHero
            compact
            eyebrow="Guests"
            title="Visitor passes"
            subtitle="Tap + to create a gate token and share the QR."
          />

          <Section label="Recent passes" />
          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !(list.data ?? []).length ? (
            <Empty
              title="No passes"
              body="Create a guest pass to get started."
              icon="person-add-outline"
              actionLabel="New pass"
              onAction={() => { setToken(''); setOpen(true) }}
            />
          ) : null}
          {(list.data ?? []).slice(0, 12).map((v, i) => (
            <FadeIn key={v.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="id-card-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{v.visitorName}</Text>
                    <Text style={styles.muted}>{v.visitType} · exp {formatDate(v.expiresAt)}</Text>
                  </View>
                  <StatusPill value={v.exitAt ? 'EXITED' : v.used ? 'USED' : 'PENDING'} />
                </View>
              </Card>
            </FadeIn>
          ))}
        </ScrollView>

        <CreateFab onPress={() => { setToken(''); setError(''); setOpen(true) }} label="Create pass" />

        <GlassSheet
          visible={open}
          onClose={closeSheet}
          title="New visitor pass"
          subtitle="Valid for 2 hours at the gate"
          icon="person-add"
          footer={(
            <>
              {!token ? (
                <Button
                  label={create.isPending ? 'Creating…' : 'Create pass'}
                  icon="qr-code"
                  loading={create.isPending}
                  disabled={name.trim().length < 2}
                  onPress={() => { setError(''); create.mutate() }}
                />
              ) : (
                <Button
                  label="Share pass"
                  variant="lime"
                  icon="share-outline"
                  onPress={() => {
                    void Share.share({
                      message: `Haven visitor pass for ${user.apartmentName || 'society'}:\n${token}`,
                    })
                  }}
                />
              )}
              <Button label="Done" variant="ghost" onPress={closeSheet} />
            </>
          )}
        >
          {!token ? (
            <>
              <Field
                label="Visitor name"
                value={name}
                onChangeText={setName}
                placeholder="Courier / guest name"
                autoCapitalize="words"
              />
              <Text style={styles.label}>Visit type</Text>
              <ChipRow>
                {['GUEST', 'DELIVERY', 'SERVICE'].map((t) => (
                  <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
                ))}
              </ChipRow>
              <ErrorText message={error} />
            </>
          ) : (
            <View style={styles.tokenBox}>
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(token)}` }}
                style={styles.qr}
              />
              <Text style={styles.tokenLabel}>Gate token</Text>
              <Text selectable style={styles.token}>{token}</Text>
            </View>
          )}
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tokenBox: { alignItems: 'center', paddingVertical: 8 },
  qr: { width: 200, height: 200, borderRadius: radius.md, marginBottom: 16, backgroundColor: '#fff' },
  tokenLabel: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  token: { fontSize: 14, color: colors.text, lineHeight: 20, alignSelf: 'stretch', fontFamily: fonts.sansMed },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  muted: { color: colors.muted, fontSize: 14, marginTop: 4, fontFamily: fonts.sans },
})
