import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useLogout } from '../../hooks/useLogout'
import type { SectionId } from '../../types'

interface Props {
  activeSection: SectionId
  isOpen: boolean
  onNavigate: (section: SectionId) => void
}

const NAV_ITEMS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'add-teams', label: 'Add Teams', icon: '➕' },
  { id: 'all-teams', label: 'All Teams', icon: '👥' },
  { id: 'send-qr', label: 'Send QR Codes', icon: '📤' },
  { id: 'attendance', label: 'Attendance', icon: '✅' }
]

const Sidebar = ({ activeSection, isOpen, onNavigate }: Props) => {
  const { handleLogout, loggingOut } = useLogout()

  return (
    <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Logging out...' : '🚪 Logout'}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar