import './style/main.css'
import Application from './javascript/Application.js'
import { loadBirthdayConfig } from './javascript/Birthday/config.js'

// Content comes from static/birthday/config.json (validated, never throws)
loadBirthdayConfig().then((config) =>
{
    window.birthdayConfig = config
    document.title = `${config.recipient}'s Birthday Drive`
    window.application = new Application({
        $canvas: document.querySelector('.js-canvas'),
        useComposer: true
    })
})
