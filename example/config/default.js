module.exports = {
  kaliber: {
    includeInServerCompilation: [/^@kaliber\/routing/, /^@kaliber\/build/],
    /** @arg {Error} e */
    reportError(e) { console.error(e) },
  }
}
