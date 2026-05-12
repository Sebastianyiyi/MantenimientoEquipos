import axios from 'axios'

// AuthService
export const authApi = axios.create({
  baseURL: 'http://localhost:5000/api',
})

// UserService
export const userApi = axios.create({
  baseURL: 'http://localhost:5001/api',
})

// EquipmentService
export const equipmentApi = axios.create({
  baseURL: 'http://localhost:5002/api',
})

// LocationService
export const locationApi = axios.create({
  baseURL: 'http://localhost:5003/api',
})

// MaintenanceService
export const maintenanceApi = axios.create({
  baseURL: 'http://localhost:5004/api',
})

const addAuthInterceptor = (instance) => {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  instance.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )
}

addAuthInterceptor(authApi)
addAuthInterceptor(userApi)
addAuthInterceptor(equipmentApi)
addAuthInterceptor(locationApi)
addAuthInterceptor(maintenanceApi)

export default authApi