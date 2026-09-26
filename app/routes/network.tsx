import { useEffect, useRef, useState } from "react"

import { toast } from "sonner"

export default function Network() {
    const [speed, setSpeed] = useState<any>({})
    const [speedHistory, setSpeedHistory] = useState<any[]>([])
    const [health, setHealth] = useState<any>()

    const healthToastShown = useRef(false)

    useEffect(() => {
        async function healthCheck() {
            try {
                const res = await fetch("/api/v1/health")

                if (!res.ok) {
                    if (!healthToastShown.current) {
                        toast("API down")
                        healthToastShown.current = true
                    }
                    return false
                }

                const data = await res.json()
                setHealth(data)

                if (data.status === "ok") {
                    healthToastShown.current = false
                    return true
                }

                return false
            } catch (error) {
                console.error("Health Check Error:", error)

                if (!healthToastShown.current) {
                    toast("API down")
                    healthToastShown.current = true
                }

                return false
            }
        }

        async function getNetworkSpeed() {
            try {
                const res = await fetch(
                    "/api/v1/proxmox/nodes/pve/network/speed"
                )

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }

                const data = await res.json()

                // Aktuelle Geschwindigkeit
                setSpeed(data)

                // Verlauf
                setSpeedHistory((prev) => [
                    ...prev.slice(-59),
                    {
                        time: new Date().toLocaleTimeString(),
                        netin: data.netin * 8 / 1_000_000,
                        netout: data.netout * 8 / 1_000_000,
                    },
                ])
            } catch (error) {
                console.error("Network Speed Error:", error)
            }
        }

        async function updateData() {
            const healthy = await healthCheck()

            if (!healthy) {
                return
            }

            await getNetworkSpeed()
        }

        updateData()

        const interval = setInterval(() => {
            updateData()
        }, 5000)

        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <div className="space-y-4">
            <div>
                <p>
                    ↓ {speed.netin != null
                        ? (speed.netin * 8 / 1_000_000).toFixed(2)
                        : "0.00"} Mbit/s
                </p>

                <p>
                    ↑ {speed.netout != null
                        ? (speed.netout * 8 / 1_000_000).toFixed(2)
                        : "0.00"} Mbit/s
                </p>
            </div>

            <div className="h-64 w-full rounded-lg border p-4">
                <svg
                    viewBox="0 0 800 250"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                >
                    {/* Download */}
                    <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        points={speedHistory
                            .map((point, index) => {
                                const max = Math.max(
                                    ...speedHistory.map((p) =>
                                        Math.max(p.netin, p.netout)
                                    ),
                                    1
                                )

                                const x =
                                    (index / Math.max(speedHistory.length - 1, 1)) * 800

                                const y = 230 - (point.netin / max) * 210

                                return `${x},${y}`
                            })
                            .join(" ")}
                    />

                    {/* Upload */}
                    <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity="0.5"
                        points={speedHistory
                            .map((point, index) => {
                                const max = Math.max(
                                    ...speedHistory.map((p) =>
                                        Math.max(p.netin, p.netout)
                                    ),
                                    1
                                )

                                const x =
                                    (index / Math.max(speedHistory.length - 1, 1)) * 800

                                const y = 230 - (point.netout / max) * 210

                                return `${x},${y}`
                            })
                            .join(" ")}
                    />
                </svg>
            </div>
        </div>
    )
}