import axios from 'axios'

export const authApi = axios.create({
  baseURL: 'http://localhost:5000/api',
})

export const userApi = axios.create({
  baseURL: 'http://localhost:5000/api',
})

export const equipmentApi = axios.create({
  baseURL: 'http://localhost:5002/api',
})

export const locationApi = axios.create({
  baseURL: 'http://localhost:5003/api',
})

export const maintenanceApi = axios.create({
  baseURL: 'http://localhost:5004/api',
})

const addAuthInterceptor = (instance) => {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn('[API WARN] No token found in localStorage for request:', config.url)
    }
    console.log('[REQ]', config.baseURL + config.url, {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
      authHeader: config.headers.Authorization ? 'YES' : 'NO',
    })
    return config
  })

  instance.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status
      const url = err.config?.baseURL + err.config?.url
      console.error('[API ERROR]', {
        status,
        url,
        data: err.response?.data,
      })
      // if (status === 403) {
      //   window.location.href = '/sin-acceso'
      // }
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