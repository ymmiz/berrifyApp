import { db } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'

/**
 * Calculate average red_percent and ranking from ripeness_data
 */
export function calculateRanking(analysis) {
  if (!analysis || !analysis.ripeness_data) {
    return { avgRedPercent: 0, ranking: "No Data" }
  }

  const strawberries = Object.values(analysis.ripeness_data)
  const totalRed = strawberries.reduce((sum, s) => sum + (s.red_percent || 0), 0)
  const avg = totalRed / strawberries.length

  let ranking = "🌱 Beginner Gardener"
  if (avg >= 70) {
    ranking = "🍓 Master Harvester"
  } else if (avg >= 30) {
    ranking = "🌿 Growing Expert"
  }

  return { avgRedPercent: avg, ranking }
}

/**
 * Save analysis + ranking into Firestore
 */
export async function saveAnalysisWithRanking(plantId, uploadId, analysis) {
  const { avgRedPercent, ranking } = calculateRanking(analysis)

  await updateDoc(doc(db, "plants", plantId, "uploads", uploadId), {
    analysis,
    avgRedPercent,
    ranking,
    status: "analyzed"
  })

  return { avgRedPercent, ranking }
}
