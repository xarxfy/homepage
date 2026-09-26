import { useEffect, useState, useRef } from "react"
import { Badge } from "~/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress"
import {
  Collapsible,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Button } from "~/components/ui/button"
import { toast } from "sonner"
import { Toaster } from "~/components/ui/sonner"
import { Play, Power, Square, RotateCw } from "lucide-react"

export default function Home() {

  const [nodes, setNodes] = useState<any[]>([])
  const [nodeInfo, setNodeInfo] = useState<any>({})
  const [vms, setVms] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [runningContainers, setRunningContainers] = useState<any>()
  const [runningVms, setRunningVms] = useState<any>()
  const [open, setOpen] = useState(false)
  const [vmsOpen, setVmsOpen] = useState(false)
  const [health, setHealth] = useState<any>()
  const healthToastShown = useRef(false)
  const [networkInfo, setNetworkInfo] = useState<any[]>([])
  const [pendingVm, setPendingVm] = useState<number | null>(null)

  const uptime = nodeInfo.uptime

  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)

  const bootTime = new Date(Date.now() - nodeInfo.uptime * 1000)

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
          // Sobald die API wieder erreichbar ist,
          // darf beim nächsten Ausfall wieder ein Toast kommen
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

    async function getNodeData() {
      try {
        const res = await fetch("/api/v1/proxmox/nodes")

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json()
        setNodes(data)

      } catch (error) {
        console.error("API Fehler:", error)
      }
    }

    async function getVms() {
      try {
        const res = await fetch("/api/v1/proxmox/nodes/pve/vms")
        const runningVms = await fetch(
          "/api/v1/proxmox/nodes/pve/vms/running"
        )

        if (!res.ok || !runningVms.ok) {
          throw new Error("VM API Fehler")
        }

        const data = await res.json()
        const runVms = await runningVms.json()

        setVms(data)
        setRunningVms(runVms["vms_running"])

      } catch (error) {
        console.error("VM API Error:", error)
      }
    }

    async function getContainers() {
      try {
        const res = await fetch(
          "/api/v1/proxmox/nodes/pve/containers"
        )

        const runningContainers = await fetch(
          "/api/v1/proxmox/nodes/pve/containers/running"
        )

        if (!res.ok || !runningContainers.ok) {
          throw new Error("Container API Fehler")
        }

        const data = await res.json()
        const runContainers = await runningContainers.json()

        setContainers(data)
        setRunningContainers(runContainers["containers_running"])

      } catch (error) {
        console.error("Container API Error:", error)
      }
    }

    async function getNodeInfo() {
      const res = await fetch("/api/v1/proxmox/nodes/pve")
      try {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json()
        setNodeInfo(data)
      } catch (error) {
        console.error(error)
      }
    }

    function formatUptime(seconds: number) {
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)

      return `${days}d ${hours}h ${minutes}m`
    }

    async function getNetworkInfo() {
      const res = await fetch("/api/v1/proxmox/nodes/pve/network")
      try {
        if (!res.ok) {
          throw new Error(`HTTP. ${res.status}`)
        }
        const data = await res.json()
        setNetworkInfo(data)
      } catch (error) {
        console.error(error)
      }
    }



    async function updateData() {
      const healthy = await healthCheck()

      if (!healthy) {
        return
      }

      await Promise.all([
        getNodeData(),
        getVms(),
        getContainers(),
        getNodeInfo(),
        formatUptime(uptime),
        getNetworkInfo(),
      ])
    }


    // Sofort prüfen
    updateData()

    // Danach alle 5 Sekunden prüfen
    const interval = setInterval(() => {
      updateData()
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  async function vmAction(vmid: number, action: "start" | "shutdown" | "stop" | "reboot") {
      if (action === "stop" && !confirm(`Stop VM ${vmid}`)) {
        return
      }
      setPendingVm(vmid)
      try {
        const res = await fetch(`/api/v1/proxmox/nodes/pve/vms/${vmid}/${action}`, {
          method: "POST",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.detail ?? `HTTP ${res.status}`)
        }

      } catch (error) {
        console.error(error)
      } finally {
        setPendingVm(null)
      }

  }

  async function containerAction(vmid: number, action: "start" | "shutdown" | "stop" | "reboot") {
      if (action === "stop" && !confirm(`Stop VM ${vmid}`)) {
        return
      }
      setPendingVm(vmid)
      try {
        const res = await fetch(`/api/v1/proxmox/nodes/pve/containers/${vmid}/${action}`, {
          method: "POST",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.detail ?? `HTTP ${res.status}`)
        }

      } catch (error) {
        console.error(error)
      } finally {
        setPendingVm(null)
      }

  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {nodes.map((node) => (
        <Card key={node.node}>
          <CardHeader className="flex justify-between">
            <h2>Node Name: {node.node}</h2>
            <p>Status: {node.status}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-5">
            <div>
              <Progress value={node.cpu}>
                <ProgressLabel>CPU Usage</ProgressLabel>
                <ProgressValue />
                <p className="text-muted-foreground">{node.cpu.toFixed(2)}</p>
              </Progress>
            </div>
            <div>

              <Progress value={parseInt((node.mem / 1024 / 1024 / 1024).toFixed(2))}>
                <ProgressLabel>RAM Usage</ProgressLabel>
                <ProgressValue />
                <p className="text-muted-foreground">{(node.mem / 1024 / 1024 / 1024).toFixed(2)} GB</p>
              </Progress>
            </div>
            <p>VMs: {runningVms}</p>
            <p>LXCs: {runningContainers}</p>

            <div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2 pr-8 text-muted-foreground">
                      Kernel Version:
                    </td>
                    <td className="py-2">
                      {nodeInfo["current-kernel"]?.release}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-8 text-muted-foreground">
                      CPU Model:
                    </td>
                    <td className="py-2">
                      {nodeInfo["cpuinfo"]?.model} ({nodeInfo["cpuinfo"]?.cpus} CPUs)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-8 text-muted-foreground">Uptime:</td>
                    <td className="py-2">{days}d {hours}h ({bootTime.toLocaleString("de-DE")})</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <table className="w-full">
                <tr>
                  <td className="py-2 pr-8 text-muted-foreground">
                    IP-Address:
                  </td>
                  <td>
                    {networkInfo.find((network) => network.iface === "vmbr0")?.cidr}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-8 text-muted-foreground">
                    Interface:
                  </td>
                  <td>
                    {networkInfo.find((network) => network.iface === "vmbr0")?.iface}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-8 text-muted-foreground">

                  </td>
                  <td>

                  </td>
                </tr>
              </table>
            </div>

          </CardContent>
        </Card>
      ))}


      <Collapsible open={vmsOpen} onOpenChange={setVmsOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg">Vms</h2>

            {vms.length > 5 && (
              <CollapsibleTrigger>
                <Button variant="outline">
                  {vmsOpen ? "Weniger anzeigen" : `Alle ${vms.length} anzeigen`}
                </Button>
              </CollapsibleTrigger>
            )}
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <tbody>
                {vms
                  .sort((a, b) => a.vmid - b.vmid)
                  .slice(0, vmsOpen ? vms.length : 5)
                  .map((vm) => (
                    <tr key={vm.vmid} className="border-b last:border-0">
                      <td className="py-2 pr-8">
                        <p>{vm.vmid} {vm.name}</p>
                        <p className="text-muted-foreground">
                          CPU: {vm.cpu.toFixed(2)} · RAM: {(vm.mem / 1024 / 1024 / 1024).toFixed(2)} GB
                        </p>
                      </td>
                      <td className="py-2 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {vm.status === "running" ? (
                            <>
                              <Button size="icon" variant="outline" title="Shutdown"
                                disabled={pendingVm === vm.vmid}
                                onClick={() => vmAction(vm.vmid, "shutdown")}>
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" title="Reboot"
                                disabled={pendingVm === vm.vmid}
                                onClick={() => vmAction(vm.vmid, "reboot")}>
                                <RotateCw className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" title="Stop"
                                className="text-red-500 hover:text-red-600"
                                disabled={pendingVm === vm.vmid}
                                onClick={() => vmAction(vm.vmid, "stop")}>
                                <Square className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button size="icon" variant="outline" title="Start"
                              className="text-green-500 hover:text-green-600"
                              disabled={pendingVm === vm.vmid}
                              onClick={() => vmAction(vm.vmid, "start")}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {vm.status === "running"
                            ? <Badge className="bg-green-400 text-black p-1">Running</Badge>
                            : <Badge className="bg-red-400 text-black p-1">Stopped</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Collapsible>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg">LXCs</h2>

            <CollapsibleTrigger>
              <Button variant="outline">
                {open ? "Weniger anzeigen" : `Alle ${containers.length} anzeigen`}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CardContent>
            <table className="w-full">
              <tbody>
                {containers
                  .sort((a, b) => a.vmid - b.vmid)
                  .slice(0, open ? containers.length : 5)
                  .map((container) => (
                    <tr key={container.vmid} className="border-b last:border-0">
                      <td className="py-2 pr-8">
                        <p>{container.vmid} {container.name}</p>
                        <p className="text-muted-foreground">
                          CPU: {container.cpu.toFixed(2)}% · RAM: {(container.mem / 1024 / 1024 / 1024).toFixed(2)} GB
                        </p>
                      </td>
                      <td className="py-2 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {container.status === "running" ? (
                            <>
                              <Button size="icon" variant="outline" title="Shutdown"
                                disabled={pendingVm === container.vmid}
                                onClick={() => containerAction(container.vmid, "shutdown")}>
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" title="Reboot"
                                disabled={pendingVm === container.vmid}
                                onClick={() => containerAction(container.vmid, "reboot")}>
                                <RotateCw className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" title="Stop"
                                className="text-red-500 hover:text-red-600"
                                disabled={pendingVm === container.vmid}
                                onClick={() => containerAction(container.vmid, "stop")}>
                                <Square className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button size="icon" variant="outline" title="Start"
                              className="text-green-500 hover:text-green-600"
                              disabled={pendingVm === container.vmid}
                              onClick={() => containerAction(container.vmid, "start")}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {container.status === "running"
                            ? <Badge className="bg-green-400 text-black p-1">Running</Badge>
                            : <Badge className="bg-red-400 text-black p-1">Stopped</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Collapsible>
      <Toaster />
    </div>
  )
}