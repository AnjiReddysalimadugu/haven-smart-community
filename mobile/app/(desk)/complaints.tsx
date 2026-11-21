import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, complaintApi, formatDate } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, Empty, ErrorText, FadeIn, Field, LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

export default function DeskComplaints() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskComplaintsBody />
    </SocietyRequired>
  )
}

function DeskComplaintsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['complaints', scopeId],
    queryFn: () => complaintApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const [notesFor, setNotesFor] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const update = useMutation({
    mutationFn: ({ id, status, resolutionNotes }: { id: string; status: string; resolutionNotes?: string }) =>
      complaintApi.updateStatus(id, { status, resolutionNotes: resolutionNotes || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      setNotesFor(null)
      setNotes('')
      setError('')
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
    onError: (err) => setError(apiError(err, 'Update failed')),
  })

  const open = (list.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
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
            eyebrow="Tickets"
            title="Help desk"
            subtitle={selected ? `Tickets for ${selected.name}` : 'Advance resident maintenance requests.'}
          />
          <SocietyScopeBar isSuper={isSuper} />
          <ErrorText message={error} />

          <Section label={`Open (${open.length})`} />
          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !open.length ? <Empty title="Queue clear" body="No open tickets." /> : null}
          {open.map((c, i) => (
            <FadeIn key={c.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{c.title}</Text>
                    <Text style={styles.muted}>
                      Flat {c.flatNumber} · {c.category} · {formatDate(c.createdAt)}
                    </Text>
                    <Text style={styles.body} numberOfLines={3}>{c.description}</Text>
                  </View>
                  <StatusPill value={c.status} />
                </View>

                {notesFor === c.id ? (
                  <View style={{ marginTop: 12 }}>
                    <Field
                      label="Resolution notes"
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="What fixed it?"
                      multiline
                    />
                    <Button
                      label={update.isPending ? 'Saving…' : 'Mark resolved'}
                      variant="lime"
                      loading={update.isPending}
                      onPress={() => update.mutate({ id: c.id, status: 'RESOLVED', resolutionNotes: notes.trim() })}
                    />
                    <View style={{ height: 8 }} />
                    <Button label="Cancel" variant="ghost" onPress={() => { setNotesFor(null); setNotes('') }} />
                  </View>
                ) : (
                  <View style={styles.actions}>
                    {c.status === 'RAISED' ? (
                      <Button
                        label="Start"
                        onPress={() => update.mutate({ id: c.id, status: 'IN_PROGRESS' })}
                      />
                    ) : null}
                    <Button
                      label="Resolve"
                      variant="lime"
                      onPress={() => { setNotesFor(c.id); setNotes('') }}
                    />
                  </View>
                )}
              </Card>
            </FadeIn>
          ))}

          <Section label="Resolved" />
          {done.slice(0, 8).map((c, i) => (
            <FadeIn key={c.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{c.title}</Text>
                    <Text style={styles.muted}>Flat {c.flatNumber}</Text>
                  </View>
                  <StatusPill value={c.status} />
                </View>
              </Card>
            </FadeIn>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 96 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  body: { color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 18 },
  actions: { marginTop: 12, gap: 8 },
})
