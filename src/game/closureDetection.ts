import type { CanonicalPolygon, ShipTurnTrail, Vector2 } from '../types'

export interface ClosureDetectionOptions {
  tolerance?: number
  minEdgeCount?: number
}

const DEFAULT_TOLERANCE = 1e-3
const DEFAULT_MIN_EDGE_COUNT = 4

const distanceSquared = (a: Vector2, b: Vector2): number =>
  (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)

const pointsEqual = (a: Vector2, b: Vector2, tolerance: number): boolean =>
  distanceSquared(a, b) <= tolerance * tolerance

const cross = (origin: Vector2, pointA: Vector2, pointB: Vector2): number =>
  (pointA.x - origin.x) * (pointB.y - origin.y) -
  (pointA.y - origin.y) * (pointB.x - origin.x)

const onSegment = (
  segmentStart: Vector2,
  point: Vector2,
  segmentEnd: Vector2,
  tolerance: number,
): boolean => {
  const minX = Math.min(segmentStart.x, segmentEnd.x) - tolerance
  const maxX = Math.max(segmentStart.x, segmentEnd.x) + tolerance
  const minY = Math.min(segmentStart.y, segmentEnd.y) - tolerance
  const maxY = Math.max(segmentStart.y, segmentEnd.y) + tolerance

  return (
    point.x >= minX &&
    point.x <= maxX &&
    point.y >= minY &&
    point.y <= maxY &&
    Math.abs(cross(segmentStart, point, segmentEnd)) <= tolerance
  )
}

const segmentsIntersect = (
  a1: Vector2,
  a2: Vector2,
  b1: Vector2,
  b2: Vector2,
  tolerance: number,
): boolean => {
  const orientation = (p: Vector2, q: Vector2, r: Vector2): number => cross(p, q, r)

  const o1 = orientation(a1, a2, b1)
  const o2 = orientation(a1, a2, b2)
  const o3 = orientation(b1, b2, a1)
  const o4 = orientation(b1, b2, a2)

  const det1 = o1 * o2
  const det2 = o3 * o4

  if (det1 < -tolerance && det2 < -tolerance) {
    return true
  }

  if (Math.abs(o1) <= tolerance && onSegment(a1, b1, a2, tolerance)) {
    return true
  }
  if (Math.abs(o2) <= tolerance && onSegment(a1, b2, a2, tolerance)) {
    return true
  }
  if (Math.abs(o3) <= tolerance && onSegment(b1, a1, b2, tolerance)) {
    return true
  }
  if (Math.abs(o4) <= tolerance && onSegment(b1, a2, b2, tolerance)) {
    return true
  }

  return false
}

const hasSelfIntersection = (
  vertices: Vector2[],
  tolerance: number,
): boolean => {
  const edgeCount = vertices.length
  for (let i = 0; i < edgeCount; i += 1) {
    const a1 = vertices[i]
    const a2 = vertices[(i + 1) % edgeCount]
    for (let j = i + 1; j < edgeCount; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === edgeCount - 1)) {
        continue
      }
      const b1 = vertices[j]
      const b2 = vertices[(j + 1) % edgeCount]
      if (segmentsIntersect(a1, a2, b1, b2, tolerance)) {
        return true
      }
    }
  }
  return false
}

const reduceVertices = (vertices: Vector2[], tolerance: number): Vector2[] => {
  if (vertices.length === 0) {
    return vertices
  }
  const reduced: Vector2[] = [vertices[0]]
  for (let i = 1; i < vertices.length; i += 1) {
    const candidate = vertices[i]
    const previous = reduced[reduced.length - 1]
    if (!pointsEqual(candidate, previous, tolerance)) {
      reduced.push(candidate)
    }
  }

  if (
    reduced.length > 1 &&
    pointsEqual(reduced[0], reduced[reduced.length - 1], tolerance)
  ) {
    reduced.pop()
  }

  return reduced
}

const computeArea = (vertices: Vector2[]): number => {
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    sum += current.x * next.y - current.y * next.x
  }
  return Math.abs(sum) / 2
}

const computeSignedArea = (vertices: Vector2[]): number => {
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    sum += current.x * next.y - current.y * next.x
  }
  return sum / 2
}

const computePerimeter = (vertices: Vector2[]): number => {
  let perimeter = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    perimeter += Math.sqrt(distanceSquared(current, next))
  }
  return perimeter
}

const rotateToCanonicalStart = (vertices: Vector2[]): Vector2[] => {
  if (vertices.length === 0) {
    return vertices
  }
  let startIndex = 0
  for (let i = 1; i < vertices.length; i += 1) {
    const candidate = vertices[i]
    const currentBest = vertices[startIndex]
    if (
      candidate.y < currentBest.y ||
      (candidate.y === currentBest.y && candidate.x < currentBest.x)
    ) {
      startIndex = i
    }
  }
  return [...vertices.slice(startIndex), ...vertices.slice(0, startIndex)]
}

const canonicalizeVertices = (
  vertices: Vector2[],
  tolerance: number,
): Vector2[] => {
  if (vertices.length === 0) {
    return vertices
  }
  const signedArea = computeSignedArea(vertices)
  const oriented = signedArea < 0 ? [...vertices].reverse() : [...vertices]
  const rotated = rotateToCanonicalStart(oriented)
  return rotated.map((vertex) => ({ ...vertex }))
}

const quantize = (value: number): number => Number(value.toFixed(6))

const canonicalIdFromVertices = (vertices: Vector2[]): string =>
  vertices.map((vertex) => `${quantize(vertex.x)}:${quantize(vertex.y)}`).join('|')

export const detectClosedPolygons = (
  trail: ShipTurnTrail,
  options: ClosureDetectionOptions = {},
): CanonicalPolygon[] => {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
  const minEdgeCount = Math.max(options.minEdgeCount ?? DEFAULT_MIN_EDGE_COUNT, 3)

  if (!trail.segments.length) {
    return []
  }

  const segments = [...trail.segments].sort(
    (a, b) => a.completedAt - b.completedAt,
  )

  const polygons: CanonicalPolygon[] = []
  let currentPoints: Vector2[] = []
  let currentSegments = 0
  let lastStart: Vector2 | null = null
  let lastCompletedAt = trail.updatedAt
  let pathClosed = false

  const resetPath = () => {
    currentPoints = []
    currentSegments = 0
    lastStart = null
    pathClosed = false
  }

  const finalizePath = () => {
    if (!pathClosed || currentPoints.length === 0) {
      resetPath()
      return
    }
    const reduced = reduceVertices(currentPoints, tolerance)
    if (reduced.length < 3 || currentSegments < minEdgeCount) {
      resetPath()
      return
    }
    if (hasSelfIntersection(reduced, tolerance)) {
      resetPath()
      return
    }
    const canonicalVertices = canonicalizeVertices(reduced, tolerance)
    const area = computeArea(canonicalVertices)
    if (area <= tolerance) {
      resetPath()
      return
    }
    const perimeter = computePerimeter(canonicalVertices)
    const polygon: CanonicalPolygon = {
      id: `${trail.turnId}:${canonicalIdFromVertices(canonicalVertices)}`,
      vertices: canonicalVertices,
      area,
      perimeter,
      turnId: trail.turnId,
      finalizedAt: lastCompletedAt,
    }
    polygons.push(polygon)
    resetPath()
  }

  segments.forEach((segment) => {
    if (!currentPoints.length) {
      currentPoints.push({ ...segment.start }, { ...segment.end })
      currentSegments = 1
      lastStart = { ...segment.start }
      pathClosed = false
    } else {
      const lastPoint = currentPoints[currentPoints.length - 1]
      if (pointsEqual(lastPoint, segment.start, tolerance)) {
        currentPoints.push({ ...segment.end })
        currentSegments += 1
      } else {
        finalizePath()
        currentPoints.push({ ...segment.start }, { ...segment.end })
        currentSegments = 1
        lastStart = { ...segment.start }
        pathClosed = false
      }
    }
    lastCompletedAt = segment.completedAt

    if (
      currentPoints.length >= 3 &&
      lastStart &&
      pointsEqual(currentPoints[currentPoints.length - 1], lastStart, tolerance)
    ) {
      pathClosed = true
      finalizePath()
    }
  })

  finalizePath()

  return polygons
}

export const polygonBoundingBox = (polygon: CanonicalPolygon) => {
  let minX = polygon.vertices[0]?.x ?? 0
  let maxX = minX
  let minY = polygon.vertices[0]?.y ?? 0
  let maxY = minY

  polygon.vertices.forEach((vertex) => {
    minX = Math.min(minX, vertex.x)
    maxX = Math.max(maxX, vertex.x)
    minY = Math.min(minY, vertex.y)
    maxY = Math.max(maxY, vertex.y)
  })

  return { minX, maxX, minY, maxY }
}

const pointInPolygon = (
  point: Vector2,
  polygon: CanonicalPolygon,
  tolerance: number,
): boolean => {
  let intersections = 0
  const { vertices } = polygon
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]

    if (onSegment(a, point, b, tolerance)) {
      return true
    }

    const intersects =
      (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1) + a.x

    if (intersects) {
      intersections += 1
    }
  }
  return intersections % 2 === 1
}

export const polygonsOverlap = (
  polygonA: CanonicalPolygon,
  polygonB: CanonicalPolygon,
  tolerance = DEFAULT_TOLERANCE,
): boolean => {
  const boxA = polygonBoundingBox(polygonA)
  const boxB = polygonBoundingBox(polygonB)

  if (
    boxA.maxX + tolerance < boxB.minX ||
    boxB.maxX + tolerance < boxA.minX ||
    boxA.maxY + tolerance < boxB.minY ||
    boxB.maxY + tolerance < boxA.minY
  ) {
    return false
  }

  for (let i = 0; i < polygonA.vertices.length; i += 1) {
    const a1 = polygonA.vertices[i]
    const a2 = polygonA.vertices[(i + 1) % polygonA.vertices.length]
    for (let j = 0; j < polygonB.vertices.length; j += 1) {
      const b1 = polygonB.vertices[j]
      const b2 = polygonB.vertices[(j + 1) % polygonB.vertices.length]
      if (segmentsIntersect(a1, a2, b1, b2, tolerance)) {
        return true
      }
    }
  }

  if (pointInPolygon(polygonA.vertices[0], polygonB, tolerance)) {
    return true
  }
  if (pointInPolygon(polygonB.vertices[0], polygonA, tolerance)) {
    return true
  }

  return false
}

export const estimateBoundingBoxOverlapArea = (
  polygonA: CanonicalPolygon,
  polygonB: CanonicalPolygon,
): number => {
  const boxA = polygonBoundingBox(polygonA)
  const boxB = polygonBoundingBox(polygonB)

  const width = Math.max(0, Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX))
  const height = Math.max(0, Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY))

  return width * height
}

