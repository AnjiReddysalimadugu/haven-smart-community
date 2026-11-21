import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, complaintApi, formatDate } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, Chip, ChipRow, CreateFab, Empty, ErrorText, FadeIn, Field, GlassSheet,
  LoadingBlock, Notice, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { colors, space } from '../../src/theme'

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HOUSEKEEPING', 'SECURITY', 'OTHER']

export default function HelpScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('PLUMBING')
  const [error, setError] = useState('')
  const list = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })

  const create = useMutation({
    mutationFn: () => complaintApi.create({ title: title.trim(), description: description.trim(), category }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      setTitle('')
      setDescription('')
      setOpen(false)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err) => setError(apiError(err, 'Could not raise ticket')),
  })

  const openTickets = (list.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
  const done = (list.data ?? []).filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status))

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={list.isFetching && !list.isLoading}
              onRefresh={() => { void list.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader
            eyebrow="Help desk"
            title="Tickets"
            subtitle="Maintenance and society requests land with desk staff."
          />
          {!user?.flatId ? <Notice message="Flat assignment required before you can raise tickets." /> : null}

          <Section label={`Open (${openTickets.length})`} />
          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !openTickets.length ? (
            <Empty
              title="No open tickets"
              body="You're clear for now."
              icon="checkmark-circle-outline"
              actionLabel={user?.flatId ? 'Raise ticket' : undefined}
              onAction={user?.flatId ? () => setOpen(true) : undefined}
            />
          ) : null}
          {openTickets.map((c, i) => (
            <FadeIn key={c.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="construct-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{c.title}</Text>
                    <Text style={styles.muted}>{c.category} · {formatDate(c.createdAt)}</Text>
                    <Text style={styles.body} numberOfLines={2}>{c.description}</Text>
                  </View>
                  <StatusPill value={c.status} />
                </View>
              </Card>
            </FadeIn>
          ))}

          {done.length ? <Section label="Resolved" /> : null}
          {done.slice(0, 6).map((c, i) => (
            <FadeIn key={c.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="checkmark-done-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{c.title}</Text>
                    <Text style={styles.muted}>{c.category}</Text>
                  </View>
                  <StatusPill value={c.status} />
                </View>
              </Card>
            </FadeIn>
          ))}
        </ScrollView>

        {user?.flatId ? (
          <CreateFab onPress={() => { setError(''); setOpen(true) }} label="Raise ticket" />
        ) : null}

        <GlassSheet
          visible={open}
          onClose={() => { setOpen(false); setError('') }}
          title="Raise a ticket"
          subtitle="Desk staff will pick this up"
          icon="construct"
          footer={(
            <Button
              label={create.isPending ? 'Sending…' : 'Submit ticket'}
              icon="send"
              loading={create.isPending}
              disabled={title.trim().length < 3 || description.trim().length < 5}
              onPress={() => { setError(''); create.mutate() }}
            />
          )}
        >
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Leak near kitchen sink" autoCapitalize="sentences" />
          <Text style={styles.label}>Category</Text>
          <ChipRow>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </ChipRow>
          <Field label="Details" value={description} onChangeText={setDescription} placeholder="What happened?" multiline />
          <ErrorText message={error} />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  body: { color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 18 },
})
