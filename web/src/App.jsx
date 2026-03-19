import { useState, useEffect } from 'react'

const PARAM_CARD_MIN_H = 'min-h-[4.5rem]'

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return initialValue
      return JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore write errors (e.g. storage full / blocked)
    }
  }, [key, state])

  return [state, setState]
}

function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

// ——— 共用元件（緊湊版）———
function Stepper({ label, value, min, max, step, unit, onChange }) {
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className="rounded-xl bg-white p-2.5 shadow-sm">
      <div className="mb-1 text-xs font-medium text-stone-500">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={dec} disabled={value <= min}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 active:bg-stone-300 disabled:opacity-40" aria-label="減少">−</button>
        <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-stone-800">
          {displayVal}<span className="ml-0.5 text-sm font-medium text-stone-500">{unit}</span>
        </span>
        <button type="button" onClick={inc} disabled={value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 active:bg-stone-300 disabled:opacity-40" aria-label="增加">+</button>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="text-sm font-bold tabular-nums text-stone-800">{displayVal}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full" />
    </div>
  )
}

// 義式濃縮粉:水 = 1:(1~3，小數一位)

// ——— 義式濃縮（無預設配方，全部自訂）———
function EspressoTab() {
  const [cupMode, setCupMode] = useState('double')   // single | double
  const [dose, setDose] = useState(18)
  const [yieldRatio, setYieldRatio] = useState(2.5)
  const [absorptionRate, setAbsorptionRate] = useState(2)
  const [grindSize, setGrindSize] = useState(5)
  const [brewTime, setBrewTime] = useState(28)
  const [tampPressure, setTampPressure] = useState(20)
  const [drinkId, setDrinkId] = useLocalStorageState('coffee.espresso.drinkId', '')
  const [customDrinks, setCustomDrinks] = useLocalStorageState('coffee.espresso.customDrinks', [])
  const [showAddDrink, setShowAddDrink] = useState(false)
  const [editingDrink, setEditingDrink] = useState(null)
  const [espressoConfigs, setEspressoConfigs] = useLocalStorageState('coffee.espresso.espressoConfigs', [])
  const [selectedConfigId, setSelectedConfigId] = useLocalStorageState('coffee.espresso.selectedConfigId', '')
  const [showAddConfig, setShowAddConfig] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [showEditPopover, setShowEditPopover] = useState(false)
  const [targetVolumeMl, setTargetVolumeMl] = useState(null)

  const TARGET_TIME_MIN = 25
  const TARGET_TIME_MAX = 30
  const brewTimeOk = brewTime >= TARGET_TIME_MIN && brewTime <= TARGET_TIME_MAX
  const tooFast = brewTime < TARGET_TIME_MIN
  const tooSlow = brewTime > TARGET_TIME_MAX

  const allDrinks = customDrinks
  const currentDrink = allDrinks.find(d => d.id === drinkId) || allDrinks[0] || null
  const selectedConfig = espressoConfigs.find(c => c.id === selectedConfigId) || espressoConfigs[0] || null
  const drinkConfig = currentDrink?.configId ? espressoConfigs.find(c => c.id === currentDrink.configId) : null
  const effectiveRatio = drinkConfig?.yieldRatio ?? currentDrink?.concentration ?? selectedConfig?.yieldRatio ?? yieldRatio

  // 修正 localStorage 可能造成的「已刪除但仍保留在選單的 id」
  useEffect(() => {
    if (selectedConfigId && !espressoConfigs.some(c => c.id === selectedConfigId)) {
      setSelectedConfigId(espressoConfigs[0]?.id ?? '')
    }
    if (drinkId && !customDrinks.some(d => d.id === drinkId)) {
      setDrinkId(customDrinks[0]?.id ?? '')
    }
  }, [espressoConfigs, customDrinks, selectedConfigId, drinkId])

  const hasMilk = currentDrink?.milkParts != null
  const totalParts = hasMilk ? 1 + currentDrink.milkParts : 1
  const cups = cupMode === 'single' ? 1 : 2
  const totalTargetVolume = targetVolumeMl != null && targetVolumeMl > 0 ? targetVolumeMl * cups : null
  const espressoFromTarget = totalTargetVolume != null ? totalTargetVolume / totalParts : null
  const doseFromTarget = espressoFromTarget != null && effectiveRatio > 0 ? Math.round((espressoFromTarget / effectiveRatio) * 10) / 10 : null
  const useTargetVolume = doseFromTarget != null
  const effectiveDose = useTargetVolume ? doseFromTarget : dose
  const effectiveYield = useTargetVolume ? Math.floor(espressoFromTarget * 10) / 10 : Math.floor(dose * effectiveRatio * 10) / 10
  const waterToDispense = Math.round((effectiveYield + effectiveDose * absorptionRate) * 10) / 10

  useEffect(() => {
    if (targetVolumeMl == null || targetVolumeMl <= 0 || effectiveRatio <= 0) return
    const cups = cupMode === 'single' ? 1 : 2
    const total = targetVolumeMl * cups
    const parts = currentDrink?.milkParts != null ? 1 + currentDrink.milkParts : 1
    const espressoMl = total / parts
    const suggested = Math.round((espressoMl / effectiveRatio) * 10) / 10
    setDose(suggested)
  }, [targetVolumeMl, cupMode, effectiveRatio, currentDrink?.milkParts, currentDrink?.id])

  const getDrinkResult = (drink) => {
    const yieldVal = dose * (drink.concentration ?? yieldRatio)
    if (drink.milkParts == null) return { extra: null, total: yieldVal, extraLabel: drink.extraLabel || '牛奶', others: drink.others || [] }
    const extra = Math.round(yieldVal * drink.milkParts * 10) / 10
    return { extra, total: Math.round((yieldVal + extra) * 10) / 10, extraLabel: drink.extraLabel || '牛奶', others: drink.others || [] }
  }

  const result = currentDrink ? getDrinkResult(currentDrink) : { extra: null, total: dose * (selectedConfig?.yieldRatio ?? yieldRatio), extraLabel: '牛奶', others: [] }

  const handleSaveCustomDrink = (form) => {
    const newDrink = {
      id: form.id || 'custom-' + Date.now(),
      name: form.name.trim(),
      configId: form.configId || undefined,
      concentration: form.concentration ?? 2.5,
      milkParts: form.milkParts != null && form.milkParts !== '' ? Number(form.milkParts) : null,
      extraLabel: form.extraLabel || '牛奶',
      others: form.others || [],
    }
    if (editingDrink) {
      setCustomDrinks(prev => prev.map(d => d.id === editingDrink.id ? newDrink : d))
      setEditingDrink(null)
    } else {
      setCustomDrinks(prev => [...prev, newDrink])
      setDrinkId(newDrink.id)
    }
    setShowAddDrink(false)
  }

  const handleDeleteDrink = (id) => {
    setCustomDrinks(prev => prev.filter(d => d.id !== id))
    if (drinkId === id) {
      const remaining = customDrinks.filter(d => d.id !== id)
      setDrinkId(remaining[0]?.id ?? '')
    }
  }

  const handleSaveConfig = (saved) => {
    if (saved.id) {
      setEspressoConfigs(prev => prev.map(c => c.id === saved.id ? saved : c))
    } else {
      const newConfig = { ...saved, id: 'config-' + Date.now() }
      setEspressoConfigs(prev => [...prev, newConfig])
      setSelectedConfigId(newConfig.id)
    }
    setShowAddConfig(false)
    setEditingConfig(null)
  }
  const handleDeleteConfig = (id) => {
    const nextConfigs = espressoConfigs.filter(c => c.id !== id)
    setEspressoConfigs(nextConfigs)
    if (selectedConfigId === id) setSelectedConfigId(nextConfigs[0]?.id ?? '')
  }

  const hints = {}
  if (tooFast) {
    hints.dose = '↓'
    hints.grind = '↓'
    hints.tamp = '↑'
    hints.yieldRatio = '↑'
  } else if (tooSlow) {
    hints.dose = '↑'
    hints.grind = '↑'
    hints.tamp = '↓'
    hints.yieldRatio = '↓'
  }

  return (
    <div className="space-y-3 pb-24">
      {/* 第一排：義式濃縮 義式濃縮下拉 產品 產品下拉 編輯icon（縮小）；點擊在咖啡色區塊上方展開/收合編輯區 */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">義式濃縮</span>
        <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none">
          <option value="">— 請新增配置 —</option>
          {espressoConfigs.map(c => (
            <option key={c.id} value={c.id}>{c.name}（1:{c.yieldRatio}）</option>
          ))}
        </select>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">產品</span>
        <select value={drinkId} onChange={(e) => setDrinkId(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none">
          <option value="">— 請新增品項 —</option>
          {allDrinks.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => { const opening = !showEditPopover; setShowEditPopover(s => !s); if (opening) { setEditingConfig(selectedConfig); setEditingDrink(currentDrink) } }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-500 text-white" aria-label="編輯濃縮與產品">
          <EditIcon className="h-3 w-3" />
        </button>
      </section>

      {/* 編輯區：點編輯 icon 直接開此畫面；義式濃縮/產品右側下拉，選後下方表單帶入 */}
      {showEditPopover && (
        <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
          <div className="px-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-stone-500 shrink-0">義式濃縮</span>
              <select value={editingConfig?.id ?? ''} onChange={(e) => { const v = e.target.value; setEditingConfig(v ? espressoConfigs.find(c => c.id === v) ?? null : null) }} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
                <option value="">新增配置</option>
                {espressoConfigs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}（1:{c.yieldRatio}）</option>
                ))}
              </select>
              {editingConfig && (
                <button type="button" onClick={() => { handleDeleteConfig(editingConfig.id); setEditingConfig(espressoConfigs.find(c => c.id !== editingConfig.id) ?? null) }} className="shrink-0 rounded px-2 py-1.5 text-xs text-white bg-red-600">刪除</button>
              )}
            </div>
            <EspressoConfigForm
              key={editingConfig?.id ?? 'new-config'}
              config={editingConfig ?? null}
              onSave={(saved) => { handleSaveConfig(saved); setEditingConfig(undefined) }}
              onCancel={() => { setEditingConfig(undefined) }}
              onDelete={editingConfig ? () => { handleDeleteConfig(editingConfig.id); setEditingConfig(undefined) } : undefined}
            />
            <div className="flex items-center gap-2 mt-3 mb-1">
              <span className="text-xs font-semibold text-stone-500 shrink-0">產品</span>
              <select value={editingDrink?.id ?? ''} onChange={(e) => { const v = e.target.value; setEditingDrink(v ? allDrinks.find(d => d.id === v) ?? null : null) }} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
                <option value="">新增品項</option>
                {allDrinks.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <CustomDrinkForm
              key={editingDrink?.id ?? 'new-drink'}
              drink={editingDrink ?? null}
              espressoConfigs={espressoConfigs}
              onSave={(form) => { handleSaveCustomDrink(form); setEditingDrink(undefined) }}
              onCancel={() => { setEditingDrink(undefined) }}
              onDelete={editingDrink ? () => { handleDeleteDrink(editingDrink.id); setEditingDrink(undefined) } : undefined}
            />
          </div>
        </section>
      )}

      <div className="flex gap-2 items-center py-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input type="number" min={0} step={1} placeholder="單杯毫升" value={targetVolumeMl ?? ''} onChange={(e) => setTargetVolumeMl(e.target.value ? Number(e.target.value) : null)} className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
          <span className="text-sm text-stone-500 shrink-0">毫升</span>
        </div>
        <div className="flex-1 min-w-0 flex gap-2">
          <button type="button" onClick={() => { setCupMode('single'); setDose(d => (d > 12 ? 10 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'single' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>單杯萃取</button>
          <button type="button" onClick={() => { setCupMode('double'); setDose(d => (d < 14 ? 18 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'double' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>雙杯萃取</button>
        </div>
      </div>
      <section className="rounded-xl border border-stone-200 bg-espresso-800 p-3 text-white shadow">
        <div className="flex">
          <div className="flex-1 min-w-0 space-y-2 text-base pr-3">
            <div className="flex justify-between"><span className="text-espresso-200">濃度比例</span><span className="tabular-nums">1 : {effectiveRatio}</span></div>
            {currentDrink?.milkParts != null && (
              <div className="flex justify-between"><span className="text-espresso-200">濃縮與{currentDrink.extraLabel || '牛奶'}的比例</span><span className="tabular-nums">1 : {currentDrink.milkParts}</span></div>
            )}
          </div>
          <div className="shrink-0 w-px self-stretch bg-espresso-600" aria-hidden />
          <div className="flex-1 min-w-0 space-y-2 text-base pl-3">
            <div className="flex justify-between"><span className="text-espresso-200">目標萃取量</span><span className="font-bold tabular-nums">{effectiveYield} ml</span></div>
            <div className="flex justify-between"><span className="text-espresso-200">機器出水量</span><span className="font-bold tabular-nums">{waterToDispense} ml</span></div>
          </div>
        </div>
        <div className="mt-3 border-t border-espresso-600 pt-2 text-center text-sm text-espresso-200">
          研磨{grindSize} · 粉重{dose}g (1:{effectiveRatio}) · {brewTime}s · 壓粉{tampPressure}kg
        </div>
      </section>

      {/* 研磨、壓粉、吸水率、出水秒數（粉重資訊移到咖啡色區塊） */}
      <section>
        <div className="grid grid-cols-2 gap-2">
          <SliderWithHint label="研磨 1→10" value={grindSize} min={1} max={10} step={1} unit="" onChange={setGrindSize} hint={hints.grind} />
          <SliderWithHint label="壓粉(公斤)" value={tampPressure} min={12} max={35} step={1} unit=" kg" onChange={setTampPressure} hint={hints.tamp} />
          <Slider label="吸水率" value={absorptionRate} min={1} max={4} step={0.1} unit="" onChange={setAbsorptionRate} />
          <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
            <div className="mb-1 flex justify-between">
              <span className="text-xs font-medium text-stone-500">出水秒數</span>
              <span className={`text-sm font-bold tabular-nums ${!brewTimeOk ? 'text-amber-600' : ''}`}>{brewTime}s {!brewTimeOk && (tooFast ? '(偏快)' : '(偏慢)')}</span>
            </div>
            <input type="number" min={15} max={45} value={brewTime} onChange={(e) => setBrewTime(Number(e.target.value) || 25)} className="w-full rounded border border-stone-200 py-1.5 px-2 text-center text-sm" />
            <p className="mt-0.5 text-[10px] text-stone-500">目標 25～30 秒</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function StepperWithHint({ label, value, min, max, step, unit, onChange, hint }) {
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between items-center">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="inline-flex w-5 justify-center text-amber-600 font-bold" title={hint === '↑' ? '可考慮調高' : hint === '↓' ? '可考慮調低' : ''}>{hint ?? '\u00A0'}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={dec} disabled={value <= min} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 disabled:opacity-40">−</button>
        <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-stone-800">{displayVal}<span className="ml-0.5 text-sm text-stone-500">{unit}</span></span>
        <button type="button" onClick={inc} disabled={value >= max} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 disabled:opacity-40">+</button>
      </div>
    </div>
  )
}

function SliderWithHint({ label, value, min, max, step, unit, onChange, hint }) {
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between items-center">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="flex items-center gap-1 min-w-[3rem] justify-end">
          <span className="inline-flex w-5 justify-center text-amber-600 font-bold">{hint ?? '\u00A0'}</span>
          <span className="text-sm font-bold tabular-nums text-stone-800">{displayVal}{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full" />
    </div>
  )
}

// 義式配置表單：名稱與比例左右對稱，無外層泡泡
function EspressoConfigForm({ config, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(config?.name || '')
  const [yieldRatio, setYieldRatio] = useState(config?.yieldRatio ?? 2.5)
  const clamp = (v) => Math.min(5, Math.max(1, Math.round(v * 10) / 10))
  return (
    <div className="mt-1">
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1 min-w-0">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="名稱（如 1:2.5 標準）" className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-xs text-stone-600 shrink-0">粉液比 1:</span>
          <input type="number" min={1} max={5} step={0.1} value={yieldRatio} onChange={(e) => setYieldRatio(clamp(Number(e.target.value) || 1))} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        <button type="button" onClick={() => onSave({ ...config, name, yieldRatio })} className="rounded px-3 py-1.5 text-xs text-white bg-espresso-600">儲存</button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-stone-700 bg-stone-200">取消</button>
        <button type="button" onClick={onDelete || (() => {})} disabled={!onDelete} className="rounded px-3 py-1.5 text-xs text-white bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">刪除</button>
      </div>
    </div>
  )
}

// 自訂飲品：名稱與下拉左右對稱；下方牛奶/水下拉、右側另一個配料；無外層泡泡
const EXTRA_LABEL_OPTIONS = [{ value: '牛奶', label: '牛奶' }, { value: '水', label: '水' }]
function CustomDrinkForm({ drink, espressoConfigs = [], onSave, onCancel, onDelete }) {
  const resolveConfigId = () => {
    if (drink?.configId && espressoConfigs.some(c => c.id === drink.configId)) return drink.configId
    if (drink?.concentration != null) {
      const m = espressoConfigs.find(c => c.yieldRatio === drink.concentration)
      if (m) return m.id
    }
    return espressoConfigs[0]?.id ?? ''
  }
  const [name, setName] = useState(drink?.name || '')
  const [configId, setConfigId] = useState(resolveConfigId())
  const [milkParts, setMilkParts] = useState(drink?.milkParts ?? 5)
  const [hasMilk, setHasMilk] = useState(drink?.milkParts != null)
  const [extraLabel, setExtraLabel] = useState(drink?.extraLabel || '牛奶')
  const [others, setOthers] = useState(drink?.others?.length ? drink.others : [{ name: '', amount: '少許' }])

  const selectedConfig = espressoConfigs.find(c => c.id === configId)
  const concentration = selectedConfig ? selectedConfig.yieldRatio : (espressoConfigs[0]?.yieldRatio ?? 2.5)

  const addOther = () => setOthers(o => [...o, { name: '', amount: '少許' }])
  const updateOther = (i, field, val) => setOthers(o => o.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeOther = (i) => setOthers(o => o.filter((_, j) => j !== i))

  return (
    <div className="mt-2">
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1 min-w-0">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="品項名稱" className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <select value={configId} onChange={(e) => setConfigId(e.target.value)} className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
            {espressoConfigs.map(c => (
              <option key={c.id} value={c.id}>{c.name}（1:{c.yieldRatio}）</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0 h-9">
            <input type="checkbox" checked={hasMilk} onChange={(e) => setHasMilk(e.target.checked)} />
            濃縮:
          </label>
          <select value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} className="h-9 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 flex-1 min-w-[4rem]" disabled={!hasMilk}>
            {EXTRA_LABEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasMilk && (
            <>
              <span className="text-xs text-stone-600 shrink-0">1:</span>
              <input type="number" min={1} step={0.5} value={milkParts} onChange={(e) => setMilkParts(Number(e.target.value) || 0)} className="h-9 w-14 rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
            </>
          )}
        </div>
        <div className="flex-1 min-w-0 flex gap-1 items-center">
          <div className="flex-1 min-w-0 space-y-1">
            {others.map((o, i) => (
              <div key={i} className="flex gap-1 items-center h-9">
                <input type="text" value={o.name} onChange={(e) => updateOther(i, 'name', e.target.value)} placeholder="名稱" className="flex-1 min-w-0 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
                <input type="text" value={o.amount} onChange={(e) => updateOther(i, 'amount', e.target.value)} placeholder="比例／少許" className="w-20 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => removeOther(i)} className="text-red-500 shrink-0 h-9 w-9 flex items-center justify-center" aria-label="刪除">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOther} className="shrink-0 flex h-9 w-9 items-center justify-center rounded border border-stone-200 text-stone-500 hover:bg-stone-50 text-lg" aria-label="新增">+</button>
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        <button type="button" onClick={() => onSave({ ...drink, name, configId: configId || undefined, concentration, milkParts: hasMilk ? milkParts : null, extraLabel: hasMilk ? extraLabel : undefined, others })} className="rounded px-3 py-1.5 text-xs text-white bg-espresso-600">儲存</button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-stone-700 bg-stone-200">取消</button>
        <button type="button" onClick={onDelete || (() => {})} className="rounded px-3 py-1.5 text-xs text-white bg-red-600">刪除</button>
      </div>
    </div>
  )
}

// ——— 手沖：時間軸萃取理論常數 (3 分鐘基準) ———
const EXTRACTION_STAGES = [
  { start: 0, end: 30, label: '悶蒸', flavor: '高強度酸質', color: 'bg-amber-300', textColor: 'text-amber-900' },
  { start: 31, end: 60, label: '前段', flavor: '酸質＋甜感', color: 'bg-amber-400', textColor: 'text-amber-900' },
  { start: 61, end: 90, label: '中段', flavor: '甜感高峰·苦初現', color: 'bg-orange-400', textColor: 'text-orange-900' },
  { start: 91, end: 120, label: '中後段', flavor: '甜降·苦增', color: 'bg-orange-600', textColor: 'text-white' },
  { start: 121, end: 150, label: '後段', flavor: '苦·澀釋放', color: 'bg-amber-800', textColor: 'text-white' },
  { start: 151, end: 180, label: '尾段', flavor: '澀·雜味·水感', color: 'bg-stone-500', textColor: 'text-white' },
]

const TROUBLESHOOTING_OPTIONS = {
  sour: {
    title: '覺得太酸、沒有甜味 (萃取不足)',
    diagnosis: '前段酸質萃取完後，未能有效萃取出中段的甜感。',
    tips: [
      { category: '時間軸操作', text: '拉長 30秒～1分30秒 之間的注水時間（甜感黃金區間），或增加此階段的給水量。' },
      { category: '研磨與水溫', text: '稍微調細研磨度，或提高水溫 1～2°C，加速整體物質釋放。' },
    ],
  },
  bitter: {
    title: '覺得太苦、澀感重、有雜味 (過度萃取)',
    diagnosis: '萃取時間拖到了 2 分鐘之後，進入了苦澀釋放區。',
    tips: [
      { category: '時間軸操作', text: '提早斷水！在 1分45秒 至 2分鐘 左右停止注水，捨棄尾段容易帶有澀感的液體。若水量不夠，最後再加入熱水 (Bypass) 補足。' },
      { category: '研磨與水溫', text: '調粗研磨度，加快水流速度，避免咖啡粉浸泡過久。' },
    ],
  },
  flat: {
    title: '覺得風味太平淡、水感重',
    diagnosis: '整體萃取效率太低，或是前段風味最強烈的物質沒有被帶出來。',
    tips: [
      { category: '時間軸操作', text: '確實做好 0～30 秒的悶蒸，並適當拉長悶蒸時間至 40 秒，確保粉層完全排氣。' },
      { category: '注水手法', text: '在前段（0～60 秒）注水時加大水流攪動，提升前中段的風味濃度。' },
    ],
  },
}

// 風味按鈕（舊的 4 項）
const FLAVOR_TIPS = {
  bitter: { title: '太苦 / 有雜味', tips: ['研磨度調粗', '降低水溫 1～2 °C', '加快水流 / 縮短萃取時間'] },
  sour: { title: '太酸 / 萃取不足', tips: ['研磨度調細', '提高水溫 1～2 °C', '延長悶蒸時間'] },
  sweet: { title: '想提升甜感與厚度', tips: ['稍微增加粉量', '增加注水段數（提高攪動）'] },
  clean: { title: '想要乾淨花果香', tips: ['減少注水段數（如一刀流）', '稍微調粗研磨'] },
}

// 時間–水量簡易圖：橫軸時間、縱軸水量，maxTime 可傳入
function TimeWaterChart({ steps, totalWater, maxTime: maxTimeProp }) {
  if (!steps?.length) return null
  const maxTime = Math.max(maxTimeProp ?? 180, ...steps.map(s => s.time))
  const maxW = Math.max(totalWater, ...steps.map(s => s.water))
  const w = 280
  const h = 120
  const pad = { l: 32, r: 24, t: 8, b: 28 }
  const x = (t) => pad.l + (t / maxTime) * (w - pad.l - pad.r)
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / maxW)

  const points = steps.map(s => ({ x: x(s.time), y: y(s.water), temp: s.temp, water: s.water, time: s.time }))
  const pathD = points.length ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* 網格線 + 座標軸 */}
      {/* 橫向網格 & 縱軸刻度（水量） */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const v = Math.round(r * maxW)
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#e5e5e5" strokeWidth="0.5" />
            <text x={pad.l - 4} y={yy + 3} textAnchor="end" className="fill-stone-500" fontSize="8">{v}</text>
          </g>
        )
      })}
      {/* 縱向網格 & 橫軸刻度（時間） */}
      {Array.from({ length: Math.floor(maxTime / 60) + 1 }, (_, i) => i * 60).filter(t => t <= maxTime).map(t => {
        const xx = x(t)
        return (
          <g key={t}>
            <line x1={xx} x2={xx} y1={pad.t} y2={h - pad.b} stroke="#e5e5e5" strokeWidth="0.5" />
            <text x={xx} y={h - 3} textAnchor="middle" className="fill-stone-500" fontSize="8">{t}"</text>
          </g>
        )
      })}
      {/* 座標軸線 */}
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.75" />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.75" />
      {/* 軸標籤 */}
      <text x={(pad.l + w - pad.r) / 2} y={h - 1} textAnchor="middle" className="fill-stone-600" fontSize="8">時間 (秒)</text>
      <text x={6} y={(pad.t + h - pad.b) / 2} textAnchor="middle" transform={`rotate(-90 6 ${(pad.t + h - pad.b) / 2})`} className="fill-stone-600" fontSize="8">水量 (ml)</text>
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-pour-500" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" className="fill-pour-600" />
          <text x={p.x} y={p.y - 6} textAnchor="middle" className="fill-stone-600" fontSize="7">{p.temp}°</text>
        </g>
      ))}
    </svg>
  )
}

//（GoldCupCard 已不再使用，移除）

// 沖煮手法：效果以 酸／甜／苦／雜 設定
const DEFAULT_TECHNIQUES = [
  { id: 'bloom', name: '悶蒸', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '排氣、均勻浸濕' },
  { id: 'circle', name: '畫圈', effectSour: '', effectSweet: '增加萃取', effectBitter: '', effectOff: '' },
  { id: 'center', name: '中心注水', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '減少攪動、較乾淨' },
  { id: 'spiral', name: '螺旋注水', effectSour: '平衡酸', effectSweet: '平衡甜', effectBitter: '', effectOff: '' },
]

function PourOverTab({ chartTimeMax, onChartTimeMaxChange }) {
  const [coffeeWeight, setCoffeeWeight] = useState(20)
  const [waterRatio, setWaterRatio] = useState(15)
  const [waterTemp, setWaterTemp] = useState(93)
  const [grindSize, setGrindSize] = useState(5)
  const [flavorIssue, setFlavorIssue] = useState(null)
  const [troubleKey, setTroubleKey] = useState(null)
  const [techniques, setTechniques] = useLocalStorageState('coffee.pour.techniques', DEFAULT_TECHNIQUES)
  const [showTechniqueForm, setShowTechniqueForm] = useState(false)
  const [editingTechnique, setEditingTechnique] = useState(null)
  const [planSteps, setPlanSteps] = useState([
    { time: 0, water: 0, temp: 93, technique: '悶蒸' },
    { time: 45, water: 60, temp: 93, technique: '畫圈' },
    { time: 90, water: 150, temp: 92, technique: '中心注水' },
    { time: 135, water: 240, temp: 92, technique: '螺旋' },
    { time: 180, water: 300, temp: 91, technique: '完成' },
  ])

  const totalWater = Math.round(coffeeWeight * waterRatio * 10) / 10
  const timeMax = Math.max(chartTimeMax ?? 180, ...planSteps.map(s => s.time))
  const [planEditing, setPlanEditing] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('default')

  const baseFlavor = { acid: 5, sweet: 5, bitter: 3, body: 4, clean: 7 }
  const FLAVOR_EQUALIZER_TECHNIQUES = [
    { id: 'big-flow', name: '大水流擾動', mod: { acid: 0, sweet: -1, bitter: 2, body: 1, clean: -3 } },
    { id: 'center-ji', name: '中心の字繞圈', mod: { acid: 1, sweet: 0, bitter: -1, body: -1, clean: 2 } },
    { id: 'tail-wash', name: '尾段洗刷粉牆', mod: { acid: -1, sweet: 2, bitter: 1, body: 2, clean: -1 } },
  ]
  const [activeTechnique, setActiveTechnique] = useState(null)
  const flavorKeys = [{ key: 'acid', label: '酸值' }, { key: 'sweet', label: '甜感' }, { key: 'bitter', label: '苦味' }, { key: 'body', label: '厚度' }, { key: 'clean', label: '乾淨度' }]

  const updateStep = (i, field, value) => {
    setPlanSteps(prev => prev.map((s, j) => j === i ? { ...s, [field]: field === 'time' || field === 'water' || field === 'temp' ? Number(value) || 0 : value } : s))
  }

  return (
    <div className="space-y-3 pb-24">
      {/* 目標總注水量 */}
      <section className="rounded-xl bg-pour-700 p-3 text-white shadow">
        <div className="flex justify-between text-sm">
          <span>目標總注水量</span>
          <span className="font-bold tabular-nums">{totalWater} ml</span>
        </div>
        <div className="mt-1 text-xs text-pour-200">水溫 {waterTemp}°C · 研磨 {grindSize}</div>
      </section>

      {/* 下拉選單 + 編輯按鈕 */}
      <section>
        <div className="mb-1.5 flex items-center justify-center">
          <div className="inline-flex w-full max-w-sm items-center gap-2">
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="flex-1 rounded border border-stone-200 bg-white py-1 px-2 text-center text-[13px] text-stone-800"
            >
              <option value="default">自訂沖煮計畫</option>
            </select>
            <button
              type="button"
              onClick={() => setPlanEditing((v) => !v)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${planEditing ? 'bg-pour-700' : 'bg-stone-500'}`}
              aria-label="編輯時間與水量"
            >
              <EditIcon className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 參數設定 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">參數設定</h2>
          <button
            type="button"
            onClick={() => { setEditingTechnique(null); setShowTechniqueForm(true) }}
            className="text-[11px] font-medium text-pour-600"
          >
            沖煮手法 新增
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[13px] mb-2">
          <input
            type="text"
            placeholder="咖啡產地"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="品種"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="加工方法"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="焙度"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
            onClick={() => setCoffeeWeight(w => Math.min(40, w + 1))}
          >
            <span>粉重 {coffeeWeight}g</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setCoffeeWeight(w => Math.min(40, w + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setCoffeeWeight(w => Math.max(10, w - 1))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
            onClick={() => setWaterRatio(r => Math.min(18, +(r + 0.5).toFixed(1)))}
          >
            <span>粉水比 1:{waterRatio}</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setWaterRatio(r => Math.min(18, +(r + 0.5).toFixed(1)))}
              >▲</button>
              <button
                type="button"
                onClick={() => setWaterRatio(r => Math.max(12, +(r - 0.5).toFixed(1)))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
            onClick={() => setWaterTemp(t => Math.min(98, t + 1))}
          >
            <span>水溫 {waterTemp}°C</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setWaterTemp(t => Math.min(98, t + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setWaterTemp(t => Math.max(85, t - 1))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
            onClick={() => setGrindSize(g => Math.min(10, g + 1))}
          >
            <span>研磨 {grindSize}</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setGrindSize(g => Math.min(10, g + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setGrindSize(g => Math.max(1, g - 1))}
              >▼</button>
            </span>
          </button>
        </div>
      </section>

      {/* 折線圖 */}
      <section>
        <div className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="mx-auto aspect-[4/2] w-full">
            <TimeWaterChart steps={planSteps} totalWater={totalWater} maxTime={timeMax} />
          </div>
        </div>
      </section>

      {/* 時間表 */}
      <section>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[360px] table-fixed text-xs">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[30%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="p-1.5 font-semibold text-stone-600 text-center">時間(s)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-center">水量(ml)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-center">水溫(°C)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-left pl-[10px]">手法</th>
                <th className="p-1.5 font-semibold text-stone-600 text-right pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!planEditing) return
                      setPlanSteps(prev => {
                        const lastT = prev.length ? Math.max(...prev.map(s => s.time)) : 0
                        return [...prev, { time: lastT + 45, water: totalWater, temp: waterTemp, technique: '' }]
                      })
                    }}
                    className="text-[10px] font-medium text-pour-600"
                  >
                    新增
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {planSteps.map((step, i) => {
                const readOnly = !planEditing
                return (
                <tr key={i} className="border-b border-stone-100">
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.time}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'time', e.target.value)}
                      readOnly={readOnly}
                      className={`w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.water}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'water', e.target.value)}
                      readOnly={readOnly}
                      className={`w-14 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.temp}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'temp', e.target.value)}
                      readOnly={readOnly}
                      className={`w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 align-middle pl-[10px]">
                    <input
                      type="text"
                      list="technique-list"
                      value={step.technique}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'technique', e.target.value)}
                      placeholder="手法"
                      readOnly={readOnly}
                      className={`w-full max-w-[110px] rounded border border-stone-200 py-1 px-1 text-stone-700 ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                    <datalist id="technique-list">{techniques.map(t => <option key={t.id} value={t.name} />)}</datalist>
                  </td>
                  <td className="p-1 text-right align-middle pr-2">
                    <button
                      type="button"
                      onClick={readOnly ? undefined : () => setPlanSteps(prev => prev.filter((_, j) => j !== i))}
                      disabled={readOnly}
                      className="text-red-500 disabled:opacity-0"
                      title="刪除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      {/* 時間–水量折線圖：最上方 */}
      <section className="hidden">
        <div className="mb-1.5 flex items-center justify-center">
          <div className="inline-flex w-full max-w-sm items-center gap-2">
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="flex-1 rounded border border-stone-200 bg-white py-1 px-2 text-center text-[13px] text-stone-800"
            >
              <option value="default">自訂沖煮計畫</option>
            </select>
            <button
              type="button"
              onClick={() => setPlanEditing((v) => !v)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${planEditing ? 'bg-pour-700' : 'bg-stone-500'}`}
              aria-label="編輯時間與水量"
            >
              <EditIcon className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="mx-auto aspect-[4/2] w-full">
            <TimeWaterChart steps={planSteps} totalWater={totalWater} maxTime={timeMax} />
          </div>
        </div>
      </section>

      {/* 沖煮計畫表 */}
      <section className="hidden">
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[360px] table-fixed text-xs">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[30%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="p-1.5 font-semibold text-stone-600 text-center">時間(s)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-center">水量(ml)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-center">水溫(°C)</th>
                <th className="p-1.5 font-semibold text-stone-600 text-left pl-[10px]">手法</th>
                <th className="p-1.5 font-semibold text-stone-600 text-right pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!planEditing) return
                      setPlanSteps(prev => {
                        const lastT = prev.length ? Math.max(...prev.map(s => s.time)) : 0
                        return [...prev, { time: lastT + 45, water: totalWater, temp: waterTemp, technique: '' }]
                      })
                    }}
                    className="text-[10px] font-medium text-pour-600"
                  >
                    新增
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {planSteps.map((step, i) => {
                const readOnly = !planEditing
                return (
                <tr key={i} className="border-b border-stone-100">
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.time}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'time', e.target.value)}
                      readOnly={readOnly}
                      className={`w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.water}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'water', e.target.value)}
                      readOnly={readOnly}
                      className={`w-14 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 text-center align-middle">
                    <input
                      type="number"
                      min={0}
                      value={step.temp}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'temp', e.target.value)}
                      readOnly={readOnly}
                      className={`w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                  </td>
                  <td className="p-1 align-middle pl-[10px]">
                    <input
                      type="text"
                      list="technique-list"
                      value={step.technique}
                      onChange={readOnly ? undefined : (e) => updateStep(i, 'technique', e.target.value)}
                      placeholder="手法"
                      readOnly={readOnly}
                      className={`w-full max-w-[110px] rounded border border-stone-200 py-1 px-1 text-stone-700 ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    />
                    <datalist id="technique-list">{techniques.map(t => <option key={t.id} value={t.name} />)}</datalist>
                  </td>
                  <td className="p-1 text-right align-middle pr-2">
                    <button
                      type="button"
                      onClick={readOnly ? undefined : () => setPlanSteps(prev => prev.filter((_, j) => j !== i))}
                      disabled={readOnly}
                      className="text-red-500 disabled:opacity-0"
                      title="刪除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        <div className="pt-1" />
      </section>

      <section className="hidden">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">參數設定</h2>
          <button
            type="button"
            onClick={() => { setEditingTechnique(null); setShowTechniqueForm(true) }}
            className="text-[11px] font-medium text-pour-600"
          >
            沖煮手法 新增
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[13px] mb-2">
          <input
            type="text"
            placeholder="咖啡產地"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="品種"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="加工方法"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
          <input
            type="text"
            placeholder="焙度"
            className="rounded border border-stone-200 px-2 py-1 text-stone-800"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
          >
            <span>粉重 {coffeeWeight}g</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setCoffeeWeight(w => Math.min(40, w + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setCoffeeWeight(w => Math.max(10, w - 1))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
          >
            <span>粉水比 1:{waterRatio}</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setWaterRatio(r => Math.min(18, +(r + 0.5).toFixed(1)))}
              >▲</button>
              <button
                type="button"
                onClick={() => setWaterRatio(r => Math.max(12, +(r - 0.5).toFixed(1)))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
          >
            <span>水溫 {waterTemp}°C</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setWaterTemp(t => Math.min(98, t + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setWaterTemp(t => Math.max(85, t - 1))}
              >▼</button>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-between rounded border border-stone-200 bg-white px-2 py-1 text-[13px] text-stone-800"
          >
            <span>研磨 {grindSize}</span>
            <span className="flex flex-col leading-[0.7] text-[10px]">
              <button
                type="button"
                onClick={() => setGrindSize(g => Math.min(10, g + 1))}
              >▲</button>
              <button
                type="button"
                onClick={() => setGrindSize(g => Math.max(1, g - 1))}
              >▼</button>
            </span>
          </button>
        </div>
      </section>

      {/* 目標總注水量 */}
      <section className="hidden rounded-xl bg-pour-700 p-3 text-white shadow">
        <div className="flex justify-between text-sm">
          <span>目標總注水量</span>
          <span className="font-bold tabular-nums">{totalWater} ml</span>
        </div>
        <div className="mt-1 text-xs text-pour-200">水溫 {waterTemp}°C · 研磨 {grindSize}</div>
      </section>

      {/* 問題導向調整指南 */}
      <section>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">問題導向指南</h2>
        <div className="grid gap-1.5">
          {Object.entries(TROUBLESHOOTING_OPTIONS).map(([key, { title }]) => (
            <button key={key} type="button"
              onClick={() => setTroubleKey(troubleKey === key ? null : key)}
              className={`rounded-lg border py-2 px-3 text-left text-xs font-medium transition ${
                troubleKey === key ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-white text-stone-700 active:bg-stone-50'
              }`}>
              {title}
            </button>
          ))}
        </div>
        {troubleKey && TROUBLESHOOTING_OPTIONS[troubleKey] && (
          <div className="mt-2 rounded-xl bg-white p-2.5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-stone-800">{TROUBLESHOOTING_OPTIONS[troubleKey].title}</h3>
            <p className="mb-2 text-xs text-stone-600">診斷：{TROUBLESHOOTING_OPTIONS[troubleKey].diagnosis}</p>
            <div className="space-y-1.5">
              {TROUBLESHOOTING_OPTIONS[troubleKey].tips.map((t, i) => (
                <div key={i}><span className="text-[10px] font-semibold text-pour-600">{t.category}</span><p className="text-xs text-stone-700">{t.text}</p></div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 沖煮手法（僅在新增/編輯時顯示表單泡泡） */}
      {showTechniqueForm && (
        <section className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow-xl">
            <TechniqueForm
              technique={editingTechnique}
              onSave={(form) => {
                const next = { id: editingTechnique?.id || 't-' + Date.now(), name: form.name, effectSour: form.effectSour ?? '', effectSweet: form.effectSweet ?? '', effectBitter: form.effectBitter ?? '', effectOff: form.effectOff ?? '' }
                if (editingTechnique) setTechniques(prev => prev.map(x => x.id === editingTechnique.id ? next : x))
                else setTechniques(prev => [...prev, next])
                setShowTechniqueForm(false)
                setEditingTechnique(null)
              }}
              onCancel={() => { setShowTechniqueForm(false); setEditingTechnique(null) }}
            />
          </div>
        </section>
      )}

      {/* 風味微調速查 */}
      <section>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">風味速查</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(FLAVOR_TIPS).map(([key, { title }]) => (
            <button key={key} type="button"
              onClick={() => setFlavorIssue(flavorIssue === key ? null : key)}
              className={`rounded-lg border py-2 px-2 text-center text-xs font-medium transition ${
                flavorIssue === key ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-white text-stone-700 active:bg-stone-50'
              }`}>
              {title}
            </button>
          ))}
        </div>
        {flavorIssue && FLAVOR_TIPS[flavorIssue] && (
          <div className="mt-2 rounded-xl bg-white p-2.5 shadow-sm">
            <h3 className="mb-1.5 text-sm font-semibold text-stone-800">{FLAVOR_TIPS[flavorIssue].title}</h3>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-stone-700">{FLAVOR_TIPS[flavorIssue].tips.map((tip, i) => <li key={i}>{tip}</li>)}</ol>
          </div>
        )}
      </section>

      {/* 手法風味預測面板 (Flavor Equalizer) */}
      <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">手法對風味影響</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {FLAVOR_EQUALIZER_TECHNIQUES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTechnique(activeTechnique === t.id ? null : t.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                activeTechnique === t.id ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {flavorKeys.map(({ key, label }) => {
            const base = baseFlavor[key]
            const mod = activeTechnique ? FLAVOR_EQUALIZER_TECHNIQUES.find(x => x.id === activeTechnique)?.mod[key] ?? 0 : 0
            const basePct = (base / 10) * 100
            const modPct = (Math.abs(mod) / 10) * 100
            const grayPct = mod < 0 ? ((base + mod) / 10) * 100 : basePct
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-stone-600">{label}</span>
                <div className="flex-1 flex h-6 items-center rounded overflow-hidden bg-stone-100">
                  {/* 底色：基礎（減少時只顯示 base+mod 長度，右側留給紅） */}
                  <div className="h-full bg-stone-400 shrink-0 transition-[width] duration-200" style={{ width: `${grayPct}%` }} />
                  {/* 變動：增加 → 綠色延伸 */}
                  {mod > 0 && (
                    <div className="h-full bg-green-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                      +{mod}
                    </div>
                  )}
                  {/* 變動：減少 → 紅色覆蓋灰色右側 */}
                  {mod < 0 && (
                    <div className="h-full bg-red-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                      -{Math.abs(mod)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TechniqueForm({ technique, onSave, onCancel }) {
  const [name, setName] = useState(technique?.name || '')
  const [effectSour, setEffectSour] = useState(technique?.effectSour ?? '')
  const [effectSweet, setEffectSweet] = useState(technique?.effectSweet ?? '')
  const [effectBitter, setEffectBitter] = useState(technique?.effectBitter ?? '')
  const [effectOff, setEffectOff] = useState(technique?.effectOff ?? '')
  return (
    <div className="mt-2 rounded-xl border border-pour-200 bg-white p-2.5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-stone-800">{technique ? '編輯手法' : '新增手法'}</h3>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：畫圈、中心注水" className="mb-2 w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
      <p className="mb-1 text-xs text-stone-500">效果（酸甜苦雜）</p>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-6 text-xs text-stone-600">酸</span>
        <input type="text" value={effectSour} onChange={(e) => setEffectSour(e.target.value)} placeholder="例：增加酸質" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-6 text-xs text-stone-600">甜</span>
        <input type="text" value={effectSweet} onChange={(e) => setEffectSweet(e.target.value)} placeholder="例：增加萃取" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-6 text-xs text-stone-600">苦</span>
        <input type="text" value={effectBitter} onChange={(e) => setEffectBitter(e.target.value)} placeholder="例：減少苦感" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className="w-6 text-xs text-stone-600">雜</span>
        <input type="text" value={effectOff} onChange={(e) => setEffectOff(e.target.value)} placeholder="例：減少雜味、較乾淨" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSave({ name, effectSour, effectSweet, effectBitter, effectOff })} className="rounded bg-pour-600 px-3 py-1.5 text-xs text-white">儲存</button>
        <button type="button" onClick={onCancel} className="rounded bg-stone-200 px-3 py-1.5 text-xs text-stone-700">取消</button>
      </div>
    </div>
  )
}

// ——— 主 App ———
export default function App() {
  const [activeTab, setActiveTab] = useState('espresso')
  const [pourChartTimeMax, setPourChartTimeMax] = useState(180)

  return (
    <div className="min-h-screen safe-area-pb">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-stone-100/95 px-3 py-2.5 backdrop-blur">
        <h1 className="flex-1 text-center text-base font-bold text-stone-800">咖啡萃取與風味調整</h1>
        <div className="w-9 shrink-0" aria-hidden />
      </header>

      <main className="mx-auto max-w-lg px-3 pt-3">
        {activeTab === 'espresso' && <EspressoTab />}
        {activeTab === 'pour' && <PourOverTab chartTimeMax={pourChartTimeMax} onChartTimeMaxChange={setPourChartTimeMax} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur safe-area-pb">
        <div className="mx-auto flex max-w-lg">
          <button type="button" onClick={() => setActiveTab('espresso')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'espresso' ? 'bg-espresso-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
            義式濃縮
          </button>
          <button type="button" onClick={() => setActiveTab('pour')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'pour' ? 'bg-pour-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
            手沖咖啡
          </button>
        </div>
      </nav>
    </div>
  )
}
