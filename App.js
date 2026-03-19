import React, { useEffect, useMemo, useState } from 'react'
import { LayoutAnimation, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function formatPct(n) {
  return `${clamp(n, 0, 100)}%`
}

// --- 手法風味預測面板（Flavor Equalizer）指定基礎與 modifiers ---
const BASE_FLAVOR = { acid: 5, sweet: 5, bitter: 3, body: 4, clean: 7 } // 0-10
const FLAVOR_KEYS = [
  { key: 'acid', label: '酸值' },
  { key: 'sweet', label: '甜感' },
  { key: 'bitter', label: '苦味' },
  { key: 'body', label: '厚度' },
  { key: 'clean', label: '乾淨度' },
]

const FLAVOR_EQUALIZER_TECHNIQUES = [
  { id: 'big-flow', name: '大水流擾動', mod: { acid: 0, sweet: -1, bitter: 2, body: 1, clean: -3 } },
  { id: 'center-ji', name: '中心の字繞圈', mod: { acid: 1, sweet: 0, bitter: -1, body: -1, clean: 2 } },
  { id: 'tail-wash', name: '尾段洗刷粉牆', mod: { acid: -1, sweet: 2, bitter: 1, body: 2, clean: -1 } },
]

const DEFAULT_TECHNIQUES = [
  { id: 'bloom', name: '悶蒸', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '排氣、均勻浸濕' },
  { id: 'circle', name: '畫圈', effectSour: '', effectSweet: '增加萃取', effectBitter: '', effectOff: '' },
  { id: 'center', name: '中心注水', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '減少攪動、較乾淨' },
  { id: 'spiral', name: '螺旋注水', effectSour: '平衡酸', effectSweet: '平衡甜', effectBitter: '', effectOff: '' },
]

function TimeWaterChart({ steps, totalWater }) {
  const w = Math.min(360, SCREEN_W - 32)
  const h = 140
  const pad = { l: 34, r: 20, t: 12, b: 34 }

  const maxTime = Math.max(1, ...(steps?.map(s => Number(s.time) || 0) ?? [1]))
  const maxW = Math.max(1, totalWater, ...(steps?.map(s => Number(s.water) || 0) ?? [0]))

  const x = (t) => pad.l + (t / maxTime) * (w - pad.l - pad.r)
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / maxW)

  const points = (steps ?? []).map(s => ({
    x: x(Number(s.time) || 0),
    y: y(Number(s.water) || 0),
    temp: Number(s.temp) || 0,
  }))

  const pathD = points.length ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const xTicks = Array.from({ length: Math.floor(maxTime / 60) + 1 }, (_, i) => i * 60).filter(t => t <= maxTime)

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {yTicks.map((r, i) => {
        const v = Math.round(r * maxW)
        const yy = y(v)
        return (
          <React.Fragment key={`yt-${i}`}>
            <Line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#e5e5e5" strokeWidth="0.6" />
            <SvgText x={pad.l - 6} y={yy + 4} fontSize={9} fill="#777" textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        )
      })}

      {xTicks.map((t) => {
        const xx = x(t)
        return (
          <React.Fragment key={`xt-${t}`}>
            <Line x1={xx} x2={xx} y1={pad.t} y2={h - pad.b} stroke="#e5e5e5" strokeWidth="0.6" />
            <SvgText x={xx} y={h - 6} fontSize={9} fill="#777" textAnchor="middle">
              {t}
              {'"'}
            </SvgText>
          </React.Fragment>
        )
      })}

      <Line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.9" />
      <Line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.9" />

      <SvgText x={(pad.l + w - pad.r) / 2} y={h - 2} fontSize={9} fill="#555" textAnchor="middle">
        時間 (秒)
      </SvgText>
      <SvgText
        x={6}
        y={(pad.t + h - pad.b) / 2}
        fontSize={9}
        fill="#555"
        textAnchor="middle"
        transform={`rotate(-90 6 ${(pad.t + h - pad.b) / 2})`}
      >
        水量 (ml)
      </SvgText>

      {!!pathD && <Path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <React.Fragment key={`pt-${i}`}>
          <Circle cx={p.x} cy={p.y} r={3} fill="#047857" />
          <SvgText x={p.x} y={p.y - 7} fontSize={8} fill="#666" textAnchor="middle">
            {p.temp}°
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  )
}

function FlavorEqualizerPanel() {
  const [activeTechnique, setActiveTechnique] = useState(null)

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }, [activeTechnique])

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>手法對風味影響</Text>

      <View style={styles.techRow}>
        {FLAVOR_EQUALIZER_TECHNIQUES.map((t) => {
          const isActive = activeTechnique === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => setActiveTechnique(isActive ? null : t.id)}
              style={[styles.techBtn, isActive ? styles.techBtnActive : null]}
            >
              <Text style={[styles.techBtnText, isActive ? styles.techBtnTextActive : null]}>{t.name}</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.equalizerBars}>
        {FLAVOR_KEYS.map(({ key, label }) => {
          const base = BASE_FLAVOR[key]
          const mod = activeTechnique ? (FLAVOR_EQUALIZER_TECHNIQUES.find(x => x.id === activeTechnique)?.mod[key] ?? 0) : 0

          const baseClamped = clamp(base, 0, 10)
          const totalClamped = clamp(base + mod, 0, 10)

          // 視覺：灰色只畫到 base（mod<0 時畫到 base+mod；mod>0 時灰色畫到 base）
          const grayVal = mod < 0 ? totalClamped : baseClamped
          const modVal = mod === 0 ? 0 : Math.abs(totalClamped - baseClamped)

          const basePct = (grayVal / 10) * 100
          const modPct = (modVal / 10) * 100

          return (
            <View key={key} style={styles.barRow}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barGray, { width: formatPct(basePct) }]} />
                {mod > 0 && (
                  <View style={[styles.barGreen, { width: formatPct(modPct) }]}>
                    <Text style={styles.barModText}>+{mod}</Text>
                  </View>
                )}
                {mod < 0 && (
                  <View style={[styles.barRed, { width: formatPct(modPct) }]}>
                    <Text style={styles.barModText}>-{Math.abs(mod)}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function PourOverTab() {
  const [coffeeWeight, setCoffeeWeight] = useState(20)
  const [waterRatio, setWaterRatio] = useState(15)
  const [waterTemp, setWaterTemp] = useState(93)
  const [grindSize, setGrindSize] = useState(5)

  const [techniques, setTechniques] = useState(DEFAULT_TECHNIQUES)
  const [showTechniqueForm, setShowTechniqueForm] = useState(false)
  const [editingTechnique, setEditingTechnique] = useState(null)

  const [planSteps, setPlanSteps] = useState([
    { time: 0, water: 0, temp: 93, technique: '悶蒸' },
    { time: 45, water: 60, temp: 93, technique: '畫圈' },
    { time: 90, water: 150, temp: 92, technique: '中心注水' },
    { time: 135, water: 240, temp: 92, technique: '螺旋注水' },
    { time: 180, water: 300, temp: 91, technique: '完成' },
  ])

  const totalWater = useMemo(() => Math.round(coffeeWeight * waterRatio * 10) / 10, [coffeeWeight, waterRatio])
  const [planEditing, setPlanEditing] = useState(false)

  const [selectedPlanId, setSelectedPlanId] = useState('default')

  const updateStep = (i, field, value) => {
    setPlanSteps(prev =>
      prev.map((s, j) => {
        if (j !== i) return s
        const isNumField = field === 'time' || field === 'water' || field === 'temp'
        if (isNumField) {
          const v = Number(value)
          return { ...s, [field]: Number.isFinite(v) ? v : 0 }
        }
        return { ...s, [field]: value }
      })
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* 目標總水量 */}
      <View style={styles.pourHero}>
        <View style={styles.heroRow}>
          <Text style={styles.heroLabel}>目標總注水量</Text>
          <Text style={styles.heroValue}>{totalWater} ml</Text>
        </View>
        <Text style={styles.heroSub}>水溫 {waterTemp}°C · 研磨 {grindSize}</Text>
      </View>

      {/* 下拉選單 + 編輯按鈕 */}
      <View style={styles.centerRow}>
        <View style={styles.dropdown}>
          <Text style={styles.dropdownText}>{selectedPlanId === 'default' ? '自訂沖煮計畫' : '自訂沖煮計畫'}</Text>
        </View>
        <Pressable
          onPress={() => setPlanEditing(v => !v)}
          style={[styles.editBtn, planEditing ? styles.editBtnActive : styles.editBtnIdle]}
        >
          <Text style={styles.editBtnText}>✎</Text>
        </Pressable>
      </View>

      {/* 參數設定 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>參數設定</Text>
          <Pressable onPress={() => { setEditingTechnique(null); setShowTechniqueForm(true) }}>
            <Text style={styles.linkBtn}>沖煮手法 新增</Text>
          </Pressable>
        </View>

        <View style={styles.originRow}>
          <TextInput placeholder="咖啡產地" style={styles.smallInput} />
          <TextInput placeholder="品種" style={styles.smallInput} />
          <TextInput placeholder="加工方法" style={styles.smallInput} />
          <TextInput placeholder="焙度" style={styles.smallInput} />
        </View>

        <View style={styles.quickGrid}>
          <Pressable style={styles.quickBtn} onPress={() => setCoffeeWeight(w => clamp(w + 1, 10, 40))}>
            <Text style={styles.quickText}>粉重 {coffeeWeight}g</Text>
            <Text style={styles.arrowCol}>▲ ▼</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => setWaterRatio(r => clamp(r + 0.5, 12, 18))}>
            <Text style={styles.quickText}>粉水比 1:{waterRatio}</Text>
            <Text style={styles.arrowCol}>▲ ▼</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => setWaterTemp(t => clamp(t + 1, 85, 98))}>
            <Text style={styles.quickText}>水溫 {waterTemp}°C</Text>
            <Text style={styles.arrowCol}>▲ ▼</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => setGrindSize(g => clamp(g + 1, 1, 10))}>
            <Text style={styles.quickText}>研磨 {grindSize}</Text>
            <Text style={styles.arrowCol}>▲ ▼</Text>
          </Pressable>
        </View>
      </View>

      {/* 折線圖 */}
      <View style={styles.chartCard}>
        <TimeWaterChart steps={planSteps} totalWater={totalWater} />
      </View>

      {/* 時間表 */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <View style={styles.thCenter}>
            <Text style={styles.thText}>時間(s)</Text>
          </View>
          <View style={styles.thCenter}>
            <Text style={styles.thText}>水量(ml)</Text>
          </View>
          <View style={styles.thCenter}>
            <Text style={styles.thText}>水溫(°C)</Text>
          </View>
          <View style={styles.thPl10}>
            <Text style={styles.thText}>手法</Text>
          </View>
          <View style={styles.thDel}>
            <Pressable
              onPress={() => {
                if (!planEditing) return
                setPlanSteps(prev => {
                  const lastT = prev.length ? Math.max(...prev.map(s => Number(s.time) || 0)) : 0
                  return [...prev, { time: lastT + 45, water: totalWater, temp: waterTemp, technique: '' }]
                })
              }}
              style={{ opacity: planEditing ? 1 : 0 }}
            >
              <Text style={styles.addText}>新增</Text>
            </Pressable>
          </View>
        </View>

        {planSteps.map((step, i) => {
          const readOnly = !planEditing
          return (
            <View key={i} style={styles.tr}>
              <View style={styles.tdCenter}>
                <TextInput
                  value={String(step.time)}
                  editable={!readOnly}
                  onChangeText={(txt) => updateStep(i, 'time', txt)}
                  keyboardType="numeric"
                  style={[styles.cellInput, readOnly ? styles.cellRead : null]}
                />
              </View>
              <View style={styles.tdCenter}>
                <TextInput
                  value={String(step.water)}
                  editable={!readOnly}
                  onChangeText={(txt) => updateStep(i, 'water', txt)}
                  keyboardType="numeric"
                  style={[styles.cellInput, readOnly ? styles.cellRead : null]}
                />
              </View>
              <View style={styles.tdCenter}>
                <TextInput
                  value={String(step.temp)}
                  editable={!readOnly}
                  onChangeText={(txt) => updateStep(i, 'temp', txt)}
                  keyboardType="numeric"
                  style={[styles.cellInput, readOnly ? styles.cellRead : null]}
                />
              </View>
              <View style={[styles.tdTech, styles.pl10]}>
                <TextInput
                  value={step.technique}
                  editable={!readOnly}
                  onChangeText={(txt) => updateStep(i, 'technique', txt)}
                  style={[styles.techInput, readOnly ? styles.techRead : null]}
                  placeholder="手法"
                />
              </View>
              <View style={[styles.tdDel, styles.pr2]}>
                <Pressable onPress={() => !readOnly && setPlanSteps(prev => prev.filter((_, j) => j !== i))} style={{ opacity: readOnly ? 0 : 1 }}>
                  <Text style={styles.delText}>×</Text>
                </Pressable>
              </View>
            </View>
          )
        })}
      </View>

      <View style={{ marginTop: 12 }}>
        <FlavorEqualizerPanel />
      </View>

      {/* 沖煮手法泡泡（新增手法） */}
      <Modal visible={showTechniqueForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>{editingTechnique ? '編輯手法' : '新增手法'}</Text>
              <Pressable onPress={() => { setShowTechniqueForm(false); setEditingTechnique(null) }}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {techniques.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.editorLabel}>手法列表（可編輯/刪除）</Text>
                  {techniques.map(t => (
                    <View key={t.id} style={styles.techItem}>
                      <Text style={styles.techItemName}>{t.name}</Text>
                      <View style={styles.techItemActions}>
                        <Pressable onPress={() => setEditingTechnique(t)}>
                          <Text style={styles.techEditText}>編輯</Text>
                        </Pressable>
                        <Pressable onPress={() => setTechniques(prev => prev.filter(x => x.id !== t.id))}>
                          <Text style={styles.techDelText}>刪</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TechniqueEditor
                initial={editingTechnique}
                onCancel={() => { setShowTechniqueForm(false); setEditingTechnique(null) }}
                onSave={(form) => {
                  if (editingTechnique) {
                    setTechniques(prev => prev.map(x => (x.id === editingTechnique.id ? { ...editingTechnique, ...form } : x)))
                  } else {
                    setTechniques(prev => [...prev, { id: 't-' + Date.now(), ...form }])
                  }
                  setShowTechniqueForm(false)
                  setEditingTechnique(null)
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

function TechniqueEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [effectSour, setEffectSour] = useState(initial?.effectSour ?? '')
  const [effectSweet, setEffectSweet] = useState(initial?.effectSweet ?? '')
  const [effectBitter, setEffectBitter] = useState(initial?.effectBitter ?? '')
  const [effectOff, setEffectOff] = useState(initial?.effectOff ?? '')

  return (
    <View style={styles.editor}>
      <Text style={styles.editorLabel}>手法名稱</Text>
      <TextInput value={name} onChangeText={setName} placeholder="例：畫圈、中心注水" style={styles.editorInput} />

      <Text style={styles.editorLabel}>效果（酸甜苦雜）</Text>

      <TextInput value={effectSour} onChangeText={setEffectSour} placeholder="酸" style={styles.editorInputSm} />
      <TextInput value={effectSweet} onChangeText={setEffectSweet} placeholder="甜" style={styles.editorInputSm} />
      <TextInput value={effectBitter} onChangeText={setEffectBitter} placeholder="苦" style={styles.editorInputSm} />
      <TextInput value={effectOff} onChangeText={setEffectOff} placeholder="雜" style={styles.editorInputSm} />

      <View style={styles.editorBtns}>
        <Pressable style={styles.primaryBtn} onPress={() => onSave({ name, effectSour, effectSweet, effectBitter, effectOff })}>
          <Text style={styles.primaryBtnText}>儲存</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onCancel}>
          <Text style={styles.secondaryBtnText}>取消</Text>
        </Pressable>
      </View>
    </View>
  )
}

function EspressoTab() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>義式濃縮（暫未移植）</Text>
        <Text style={styles.placeholderText}>目前先把你手沖頁面與手法風味預測面板做成原生離線版。</Text>
      </View>
    </ScrollView>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('espresso')

  return (
    <View style={styles.app}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>咖啡萃取與風味調整</Text>
      </View>

      {activeTab === 'espresso' ? <EspressoTab /> : <PourOverTab />}

      <View style={styles.bottomNav}>
        <Pressable style={[styles.navBtn, activeTab === 'espresso' ? styles.navBtnActive : null]} onPress={() => setActiveTab('espresso')}>
          <Text style={[styles.navBtnText, activeTab === 'espresso' ? styles.navBtnTextActive : null]}>義式濃縮</Text>
        </Pressable>
        <Pressable style={[styles.navBtn, activeTab === 'pour' ? styles.navBtnActive : null]} onPress={() => setActiveTab('pour')}>
          <Text style={[styles.navBtnText, activeTab === 'pour' ? styles.navBtnTextActive : null]}>手沖咖啡</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
  header: { height: 54, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#444' },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e7e5e4', backgroundColor: '#ffffff' },
  navBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  navBtnActive: { backgroundColor: '#2563eb' },
  navBtnText: { color: '#6b7280', fontWeight: '600' },
  navBtnTextActive: { color: '#fff' },

  scrollContent: { padding: 12, paddingBottom: 120, gap: 12 },

  pourHero: { borderRadius: 12, backgroundColor: '#0b5dff', padding: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  heroSub: { marginTop: 6, color: '#dbeafe', fontSize: 12 },

  centerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  dropdown: { flex: 1, maxWidth: 360, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dropdownText: { textAlign: 'center', fontSize: 14, color: '#333', fontWeight: '500' },
  editBtn: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  editBtnActive: { backgroundColor: '#0b5dff' },
  editBtnIdle: { backgroundColor: '#6b7280' },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section: { borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e5e4', padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#444' },
  linkBtn: { color: '#0b5dff', fontWeight: '600' },
  originRow: { flexDirection: 'row', gap: 8, flexWrap: 'nowrap' },
  smallInput: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: '#333', marginRight: 6 },

  quickGrid: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#fff' },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickText: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  arrowCol: { color: '#0b5dff', fontSize: 11, fontWeight: '700' },

  chartCard: { borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4', padding: 8, backgroundColor: '#fff', overflow: 'hidden' },

  tableCard: { borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: '#fff', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f4', borderBottomWidth: 1, borderBottomColor: '#e7e5e4' },
  thCenter: { flex: 1, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  thPl10: { flex: 1.25, paddingVertical: 8, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 10 },
  thDel: { width: 44, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 10, paddingVertical: 8 },
  thText: { fontSize: 12, fontWeight: '700', color: '#555' },
  thTextRight: { fontSize: 12, fontWeight: '700', color: '#555', textAlign: 'right' },
  addText: { color: '#0b5dff', fontSize: 12, fontWeight: '800' },

  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tdCenter: { flex: 1, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  tdTech: { flex: 1.25, paddingVertical: 6, justifyContent: 'center' },
  tdDel: { width: 44, paddingVertical: 6, justifyContent: 'center', alignItems: 'flex-end' },
  pl10: { paddingLeft: 10 },
  pr2: { paddingRight: 10 },
  cellInput: { width: '100%', minHeight: 34, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: 'center', fontSize: 13, color: '#111' },
  cellRead: { borderColor: 'transparent', borderWidth: 1, backgroundColor: 'transparent' },
  techInput: { width: '100%', minHeight: 34, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#111' },
  techRead: { borderColor: 'transparent', backgroundColor: 'transparent' },
  delText: { color: '#ef4444', fontSize: 18, fontWeight: '800' },

  panel: { borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: '#fff', padding: 14 },
  panelTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', color: '#444', marginBottom: 10 },

  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  techBtn: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f5f5f4' },
  techBtnActive: { borderColor: '#0b5dff', backgroundColor: '#dbeafe' },
  techBtnText: { color: '#444', fontSize: 12, fontWeight: '700' },
  techBtnTextActive: { color: '#0b5dff' },

  equalizerBars: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 44, fontSize: 12, color: '#6b7280', fontWeight: '600' },
  barTrack: { flex: 1, height: 22, borderRadius: 999, backgroundColor: '#eef2f7', overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  barGray: { height: '100%', backgroundColor: '#cbd5e1' },
  barGreen: { height: '100%', backgroundColor: '#10b981', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 6 },
  barRed: { height: '100%', backgroundColor: '#ef4444', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 6 },
  barModText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { width: '100%', maxWidth: 430, borderRadius: 12, backgroundColor: '#fff', padding: 12 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#444' },
  modalClose: { fontSize: 18, fontWeight: '800', color: '#666' },

  techItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#f5f5f4', marginBottom: 8 },
  techItemName: { width: 120, fontSize: 13, fontWeight: '700', color: '#333' },
  techItemActions: { flexDirection: 'row', gap: 14 },
  techEditText: { fontSize: 12, fontWeight: '700', color: '#0b5dff' },
  techDelText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },

  editor: { paddingTop: 10, paddingBottom: 16 },
  editorLabel: { fontSize: 13, fontWeight: '800', color: '#444', marginBottom: 6 },
  editorInput: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#333', marginBottom: 10 },
  editorInputSm: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#333', marginBottom: 10 },
  editorBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  primaryBtn: { flex: 1, backgroundColor: '#0b5dff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { flex: 1, backgroundColor: '#e7e5e4', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#444', fontWeight: '800' },

  placeholderCard: { marginTop: 40, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: '#fff' },
  placeholderTitle: { fontSize: 16, fontWeight: '900', color: '#444', marginBottom: 8 },
  placeholderText: { fontSize: 13, color: '#666' },
})
