import { useState, useCallback } from 'react'
import type { SectionId } from '../types'
import { useScrollLock } from '../hooks/useScrollLock'
import { TeamsProvider } from '../context/TeamsContext'
import LoadingOverlay from '../components/common/LoadingOverlay'
import Sidebar from '../components/admin/Sidebar'
import AdminHeader from '../components/admin/AdminHeader'
import AddTeams from '../components/admin/AddTeams'
import AllTeams from '../components/admin/AllTeams'
import SendQR from '../components/admin/SendQR'
import Attendance from '../components/admin/Attendance'

const AdminPageContent = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('add-teams')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)

  useScrollLock(sidebarOpen)

  const handleNavigate = useCallback((section: SectionId) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }, [])

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="admin-page">
      <Sidebar
        activeSection={activeSection}
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        <AdminHeader onMenuToggle={handleMenuToggle} />

        <div className="content-wrapper">
          <div className={activeSection === 'add-teams' ? 'section-visible' : 'section-hidden'}>
            <AddTeams setPageLoading={setPageLoading} />
          </div>
          <div className={activeSection === 'all-teams' ? 'section-visible' : 'section-hidden'}>
            <AllTeams setPageLoading={setPageLoading} />
          </div>
          <div className={activeSection === 'send-qr' ? 'section-visible' : 'section-hidden'}>
            <SendQR />
          </div>
          <div className={activeSection === 'attendance' ? 'section-visible' : 'section-hidden'}>
            <Attendance />
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={handleOverlayClick}
          role="button"
          aria-label="Close sidebar"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarOpen(false)}
        />
      )}

      <LoadingOverlay show={pageLoading} />
    </div>
  )
}

const AdminPage = () => {
  return (
    <TeamsProvider>
      <AdminPageContent />
    </TeamsProvider>
  )
}

export default AdminPage