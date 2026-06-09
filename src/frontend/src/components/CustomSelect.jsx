import { useState, useEffect, useRef } from 'react'
import './CustomSelect.css'

export default function CustomSelect({
  value,
  onChange,
  options,
  borderless = false,
  showTriggerIcon = true,
  placeholder = 'Seleccione...',
  style = {},
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0]

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div 
      className={`custom-select-container ${borderless ? 'borderless' : ''} ${isOpen ? 'open' : ''} ${className}`}
      style={style}
      ref={containerRef}
    >
      <button 
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select-trigger-content">
          {showTriggerIcon && selectedOption?.icon && (
            <span className="custom-select-option-icon" style={{ color: selectedOption.iconColor }}>
              {selectedOption.icon}
            </span>
          )}
          {selectedOption?.badgeColor && selectedOption?.badgeBg ? (
            <span 
              className="custom-select-badge-preview" 
              style={{ background: selectedOption.badgeBg, color: selectedOption.badgeColor }}
            >
              {selectedOption.label}
            </span>
          ) : (
            <span className="custom-select-trigger-text">{selectedOption?.label ?? placeholder}</span>
          )}
        </span>
        <svg 
          className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`}
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <ul className="custom-select-options">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value)
            return (
              <li 
                key={option.value} 
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.icon && (
                  <span className="custom-select-option-icon" style={{ color: option.iconColor }}>
                    {option.icon}
                  </span>
                )}
                {option.badgeBg && option.badgeColor ? (
                  <span 
                    className="custom-select-badge" 
                    style={{ background: option.badgeBg, color: option.badgeColor }}
                  >
                    {option.label}
                  </span>
                ) : (
                  <span className="custom-select-option-text">{option.label}</span>
                )}
                {isSelected && (
                  <svg 
                    className="custom-select-check" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="var(--color-primary, #C0191F)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 5 12" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
