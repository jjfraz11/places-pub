// app.js -- main entry point for places.pub server
//
//  Copyright 2017 Evan Prodromou <evan@prodromou.name>
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

const express = require('express')
const path = require('path')
const fetch = require('node-fetch')
const qs = require('querystring')

const AS2 = 'https://www.w3.org/ns/activitystreams'

const app = express()

function makeURI (path) {
  return `${process.env.URL_ROOT}${path}`
}

app.use(express.static(__dirname))
app.use(express.static(path.join(__dirname, 'src')))

// Place route

app.get('/osm/:id', async (req, res, next) => {
  const {id} = req.params
  const qa = {
    osm_ids: id,
    format: 'json',
    namedetails: 1,
    addressdetails: 1,
    email: process.env.EMAIL
  }
  const qp = qs.stringify(qa)
  const url = `http://nominatim.openstreetmap.org/lookup?${qp}`
  try {
    // TODO: cache results
    const nres = await fetch(url)
    const njson = await nres.json()
    if (!Array.isArray(njson)) {
      throw new Error(`Unexpected result type: ${typeof njson}`)
    }
    if (njson.length !== 1) {
      throw new Error(`Unexpected result length: ${njson.length}`)
    }
    const [nplace] = njson
    const name = (nplace.namedetails.name) ? nplace.namedetails.name : nplace.display_name

    const as2place = {
      '@context': AS2,
      type: 'Place',
      id: makeURI(`/osm/${id}`),
      name: name,
      latitude: parseFloat(nplace.lat),
      longitude: parseFloat(nplace.lon)
    }
    res.json(as2place)
  } catch (err) {
    next(err)
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.use((err, req, res, next) => {
  if (req.is('json')) {
    res.json({
      status: 'Error',
      message: err.message
    })
  } else {
    next()
  }
})

const DEFAULT_PORT = 8080
const port = (process.env.PORT) ? parseInt(process.env.PORT, 10) : DEFAULT_PORT

app.listen(port)

console.log(`Server listening on localhost:${port}`)
