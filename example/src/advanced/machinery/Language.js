const languageContext = React.createContext(null)

export function useLanguage() {
  const context = React.useContext(languageContext)
  if (!context) throw new Error('Please use a language context before trying to get the language')
  return context
}

export function LanguageContext({ language, children }) {
  return <languageContext.Provider value={language} {...{ children }} />
}
