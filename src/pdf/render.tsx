import { Document, Font, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import sans from '@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff?url'
import sansBold from '@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff?url'
import serif from '@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff?url'
import { normalizeResume, type Resume, type ResumeDocument, type Template } from '../curriculo/model'
import { themes } from './themes'

Font.register({ family: 'Source Sans', fonts: [{ src: sans }, { src: sansBold, fontWeight: 700 }] })
Font.register({ family: 'Baskerville', src: serif, fontWeight: 700 })
Font.registerHyphenationCallback((word) => {
  const characters = Array.from(word)
  if (characters.length < 24) return [word]
  return Array.from({ length: Math.ceil(characters.length / 12) }, (_, index) =>
    characters.slice(index * 12, index * 12 + 12).join(''))
})

function ResumePdf({ data, template }: { data: ResumeDocument; template: Template }) {
  const theme = themes[template]
  const styles = StyleSheet.create({
    page: { padding: theme.pad, fontFamily: 'Source Sans', fontSize: 11, lineHeight: 1.35, color: theme.ink },
    header: {
      textAlign: theme.centered ? 'center' : 'left',
      marginBottom: 20,
      paddingBottom: 12,
      ...(theme.band
        ? { backgroundColor: theme.accent, color: '#ffffff', paddingHorizontal: 14, paddingTop: 12 }
        : { borderBottomWidth: template === 'moderno' ? 2 : 0.8, borderBottomColor: theme.accent }),
    },
    name: { fontFamily: theme.heading, fontWeight: 700, fontSize: theme.name, lineHeight: 1.17, marginBottom: 5 },
    contact: { fontSize: 10 },
    link: { fontSize: 10, color: theme.band ? '#ffffff' : theme.accent },
    section: { marginBottom: theme.compact ? 10 : 13 },
    heading: {
      color: theme.accent, fontSize: template === 'moderno' ? 14 : 12,
      fontFamily: theme.heading, fontWeight: 700, paddingBottom: 3, marginBottom: 5,
      borderBottomWidth: template === 'classico' ? 0 : 0.6, borderBottomColor: theme.rule,
    },
    entry: { marginBottom: 7 },
    entryTitle: { fontWeight: 700, fontSize: 11.5 },
    detail: { color: '#444e5a', marginBottom: 2 },
  })
  const { city, phone, email, link, name } = data.personal
  const contact = [city, phone, email].filter(Boolean).join(' · ')
  const validLink = link && /^https?:\/\//i.test(link)
  return (
    <Document title={name ? 'Currículo de ' + name : 'Currículo'} language="pt-BR">
      <Page size="A4" style={styles.page}>
        {(name || contact || link) && <View style={styles.header}>
          {name && <Text style={styles.name} minPresenceAhead={14}>{name}</Text>}
          {contact && <Text style={styles.contact}>{contact}</Text>}
          {link && (validLink ? <Link src={link} style={styles.link}>{link}</Link> : <Text style={styles.contact}>{link}</Text>)}
        </View>}
        {data.sections.map((section) => <View key={section.title} style={styles.section}>
          <Text style={styles.heading} minPresenceAhead={theme.compact ? 23 : 26}>{section.title}</Text>
          {section.compact
            ? <Text>{section.entries.map(({ title }) => title).join(' · ')}</Text>
            : section.entries.map(({ title, detail, body }, index) => <View key={index} style={styles.entry}>
              {title && <Text style={styles.entryTitle} minPresenceAhead={detail || body ? 14 : 0}>{title}</Text>}
              {detail && <Text style={styles.detail} minPresenceAhead={body ? 12 : 0}>{detail}</Text>}
              {body && <Text orphans={2} widows={2}>{body}</Text>}
            </View>)}
        </View>)}
      </Page>
    </Document>
  )
}

export function generatePdf(resume: Resume, template: Template) {
  return pdf(<ResumePdf data={normalizeResume(resume)} template={template} />).toBlob()
}
