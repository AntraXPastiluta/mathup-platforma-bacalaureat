import { useAuth } from '../../../app/providers/AuthProvider'
import { getAdminSectionsForUser } from '../constants'

export function SectionNav({ activeSection, onSelectSection }) {
  const { isTechnicalAdmin } = useAuth()
  const sections = getAdminSectionsForUser(isTechnicalAdmin)

  return (
    <nav
      aria-label="Secțiuni administrare"
      className="admin-section-nav mb-12"
    >
      <ul className="admin-section-nav__list">
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <li key={section.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`admin-section-card w-full ${
                  isActive ? 'admin-section-card--active' : ''
                }`}
              >
                <span
                  className={`admin-section-card__icon ${
                    isActive ? 'admin-section-card__icon--active' : ''
                  }`}
                  aria-hidden
                >
                  <section.icon className="size-5" />
                </span>

                <span className="admin-section-card__text min-w-0 flex-1">
                  <span className="admin-section-card__title">{section.label}</span>
                  <span className="admin-section-card__desc">{section.description}</span>
                </span>

                {isActive ? (
                  <span className="admin-section-card__dot" aria-hidden />
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
