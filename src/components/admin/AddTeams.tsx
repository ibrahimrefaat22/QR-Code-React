import { useState, useCallback } from 'react'
import ImportExcel from './ImportExcel'
import ManualAdd from './ManualAdd'

interface Props {
  setPageLoading: (value: boolean) => void
}

type TabId = 'import-excel' | 'add-manual'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'import-excel', label: 'Import from Excel', icon: '📁' },
  { id: 'add-manual', label: 'Add Manually', icon: '➕' }
]

const AddTeams = ({ setPageLoading }: Props) => {
  const [activeTab, setActiveTab] = useState<TabId>('import-excel')

  return (
    <section>
      <h2>Add Teams</h2>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'import-excel' && <ImportExcel setPageLoading={setPageLoading} />}
      {activeTab === 'add-manual' && <ManualAdd />}
    </section>
  )
}

export default AddTeams