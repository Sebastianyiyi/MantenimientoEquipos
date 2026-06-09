import { useNavigate } from 'react-router-dom'
import './BackButton.css'

/**
 * Botón de regresar unificado.
 * Se posiciona de forma fija en la esquina superior izquierda.
 *
 * Props:
 *  - to: ruta a la que navegar (string). Si no se pasa, usa navigate(-1).
 *  - label: texto del botón (default: "Regresar")
 */
export default function BackButton({ to, label = 'Regresar' }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) navigate(to)
    else navigate(-1)
  }

  return (
    <button className="back-btn" onClick={handleClick} aria-label={label}>
      <svg
        className="back-btn__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="M12 5l-7 7 7 7" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
