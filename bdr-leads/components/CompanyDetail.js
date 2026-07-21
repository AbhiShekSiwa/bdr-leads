import { colors } from './shared'
import BriefTab from './tabs/BriefTab'
import PeopleTab from './tabs/PeopleTab'
import SequenceTab from './tabs/SequenceTab'
import QualityTab from './tabs/QualityTab'
import HistoryTab from './tabs/HistoryTab'

const TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'people', label: 'People' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'quality', label: 'Quality' },
  { id: 'history', label: 'History' }
]

export default function CompanyDetail({
  company,
  activeTab,
  onTabChange,
  researchResult,
  loadingResearch,
  onResearch,
  people,
  loadingPeople,
  onFindPeople,
  onContactSelect,
  contactName,
  contactTitle,
  askType,
  onContactNameChange,
  onContactTitleChange,
  onAskTypeChange,
  signals,
  loadingSignals,
  onScanSignals,
  loadingSequence,
  onGenerateSequence,
  sequence,
  editedEmails,
  onEmailsChange,
  onStatusUpdate
}) {
  if (!company) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: colors.muted }}>
        Select a company from the list, or add a new one.
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minWidth: 0,
      background: colors.surface
    }}>
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: `0.5px solid ${colors.border}`,
        padding: '0 16px',
        flexShrink: 0
      }}>
        {TABS.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                border: 'none',
                background: 'transparent',
                borderBottom: active ? `2px solid ${colors.accent}` : '2px solid transparent',
                color: active ? colors.accent : colors.muted,
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                padding: '14px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: -1
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'brief' && (
          <BriefTab
            company={company}
            researchResult={researchResult}
            loadingResearch={loadingResearch}
            onResearch={onResearch}
            onStatusUpdate={onStatusUpdate}
          />
        )}
        {activeTab === 'people' && (
          <PeopleTab
            people={people}
            loadingPeople={loadingPeople}
            onFindPeople={onFindPeople}
            onContactSelect={onContactSelect}
          />
        )}
        {activeTab === 'sequence' && (
          <SequenceTab
            contactName={contactName}
            contactTitle={contactTitle}
            askType={askType}
            onContactNameChange={onContactNameChange}
            onContactTitleChange={onContactTitleChange}
            onAskTypeChange={onAskTypeChange}
            signals={signals}
            loadingSignals={loadingSignals}
            onScanSignals={onScanSignals}
            loadingSequence={loadingSequence}
            onGenerateSequence={onGenerateSequence}
            sequence={sequence}
            onEmailsChange={onEmailsChange}
          />
        )}
        {activeTab === 'quality' && (
          <QualityTab sequence={sequence} editedEmails={editedEmails} />
        )}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
