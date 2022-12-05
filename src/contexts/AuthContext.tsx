import { createContext, ReactNode, useEffect, useState } from "react";
import * as Google from 'expo-auth-session/providers/google'
import * as AuthSection from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { api } from "../services/api";

import AsyncStorage from "@react-native-async-storage/async-storage"

WebBrowser.maybeCompleteAuthSession();

interface UserProps {
  name: string;
  avatarUrl: string;
}

export interface AuthContextDataProps {
  user: UserProps;
  isUserLoading: boolean;
  signIn: () => Promise<void>
}

interface AuthProviderProps{
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextDataProps);

export function AuthContextProvider({ children }: AuthProviderProps){

  const [ user, setUser ] = useState<UserProps>({} as UserProps)
  const [ isUserLoading, setIsUserLoading ] = useState(false)

  const [ request, response, promptAsync ] = Google.useAuthRequest({
    clientId: '315173867540-8t2a80fan9sf4vekq5k8j9ke20q8dvub.apps.googleusercontent.com',
    redirectUri: AuthSection.makeRedirectUri({ useProxy: true }),
    scopes: ['profile', 'email']
  })

  async function signIn() {
    try {
      setIsUserLoading(true)
      await promptAsync()

    } catch (error) {
      console.log(error)
      throw error
    } finally {
      setIsUserLoading(false)
    }
  }

  async function signInWithGoogle(access_token: string){
    try {
      setIsUserLoading(true)
      
      const responseToken = await api.post('/users', { access_token });
      api.defaults.headers.common['Authorization'] = `Bearer ${responseToken.data.token}`

      const userInfoResponse = await api.get('/me')

      await AsyncStorage.setItem('@copa/log', JSON.stringify(userInfoResponse.data.user))

      setUser(userInfoResponse.data.user)

    } catch (error) {
      console.log(error)
      throw error
    } finally {
      setIsUserLoading(false)
    }
  }

  async function verifyLogin(){

    setIsUserLoading(true)

    const userLogged = JSON.parse(await AsyncStorage.getItem('@copa/log'))
    
    setUser(userLogged ?? user)
    
    setIsUserLoading(false)
    
  }

  useEffect(() => {

    verifyLogin()

    if(response?.type === 'success' && response?.authentication?.accessToken){
      signInWithGoogle(response.authentication.accessToken)
    }
  }, [response])

  return (
    <AuthContext.Provider value={{ 
      signIn,
      isUserLoading,
      user,
    }}>
      { children }
    </AuthContext.Provider>
  )

}
