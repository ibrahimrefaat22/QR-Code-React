import { useAuth } from '../../context/AuthContext'

interface Props {
  onMenuToggle: () => void
}

const AdminHeader = ({ onMenuToggle }: Props) => {
  const { profile, user } = useAuth()

  return (
    <header className="admin-header">
      <div className="header-content">
        <div className="header-left">
          <button
            type="button"
            className="menu-toggle"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar menu"
          >
            ☰
          </button>
          <h1>Admin Dashboard</h1>
        </div>

        <div className="header-user">
          <span>{profile?.name ?? user?.email ?? 'Loading...'}</span>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader