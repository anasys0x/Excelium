const express = require('express')
const multer  = require('multer')
const { spawn } = require('child_process')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

const app    = express()
const upload = multer({ dest: os.tmpdir() })

app.use(express.static(path.join(__dirname, '../frontend')))

app.post('/api/workbook', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })

  const xlsxPath = req.file.path + '.xlsx'
  fs.renameSync(req.file.path, xlsxPath)

  const script = path.join(__dirname, '../backend/export.py')
  const py = spawn('python3', [script, xlsxPath])

  let out = '', err = ''
  py.stdout.on('data', d => out += d)
  py.stderr.on('data', d => err += d)

  py.on('close', code => {
    fs.unlinkSync(xlsxPath)
    if (code !== 0) return res.status(422).json({ error: err.trim() })
    try { res.json(JSON.parse(out)) }
    catch { res.status(500).json({ error: 'Réponse Python invalide' }) }
  })
})

app.listen(3011, () => console.log('http://localhost:3001'))
