import '@mantine/core/styles/baseline.css'
import '@mantine/core/styles/default-css-variables.css'
import '@mantine/core/styles/global.css'
import '@mantine/core/styles/UnstyledButton.css'
import '@mantine/core/styles/Button.css'
import '@mantine/core/styles/CloseButton.css'
import '@mantine/core/styles/Group.css'
import '@mantine/core/styles/Input.css'
import '@mantine/core/styles/Loader.css'
import '@mantine/core/styles/Overlay.css'
import '@mantine/core/styles/ModalBase.css'
import '@mantine/core/styles/Modal.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-700.css'
import '../site/base.css'
import { MantineProvider, createTheme } from '@mantine/core'
import { createRoot } from 'react-dom/client'
import Editor from './Editor'

const theme = createTheme({
  primaryColor: 'verde',
  primaryShade: 7,
  colors: {
    verde: ['#eaf5ef', '#dceee4', '#bddccd', '#97c9b2', '#71b89b', '#4e9b7d', '#367e63', '#225c47', '#164b38', '#123d2e'],
  },
  fontFamily: '"Source Sans 3", system-ui, sans-serif',
  defaultRadius: 'sm',
})

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme}><Editor /></MantineProvider>,
)
