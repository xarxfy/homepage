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
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Button } from "~/components/ui/button"
import { toast } from "sonner"
import { Toaster } from "~/components/ui/sonner"

export default function Home() {

  const [nodes, setNodes] = useState<any[]>([])
  const [nodeInfo, setNodeInfo] = useState<any>({})
  const [vms, setVms] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [runningContainers, setRunningContainers] = useState<any>()
  const [runningVms, setRunningVms] = useState<any>()
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<any>()
  const healthToastShown = useRef(false)
  const [networkInfo, setNetworkInfo] = useState<any[]>([])

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

    async function getNetworkInfo(){
      const res = await fetch("/api/v1/proxmox/nodes/pve/network")
      try{
        if(!res.ok){
          throw new Error(`HTTP. ${res.status}`)
        }
        const data = await res.json()
        setNetworkInfo(data)
      } catch(error){
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
                      {nodeInfo["cpuinfo"]?.model} ({nodeInfo["cpuinfo"].cpus} CPUs)
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
                    {networkInfo.find((network) => network.iface === "vmbr0")?.address}
                  </td>
                </tr>
              </table>
            </div>

          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <h2 className="text-lg">Vms</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-5">
            {vms
              .sort((a, b) => a.vmid - b.vmid)
              .map((vm) => (
                <Card key={vm.node} className="w-full">
                  <CardHeader>
                    <h2>{vm.name}</h2>
                  </CardHeader>
                  <CardContent>

                    <p>CPU: {vm.cpu.toFixed(2)}</p>
                    <p>RAM: {(vm.mem / 1024 / 1024 / 1024).toFixed(2)} GB</p>
                    {vm.status == "running" ? <Badge className="bg-green-400 text-black p-1">Running</Badge> : <Badge className="bg-red-400 text-black p-1">Stopped</Badge>}
                  </CardContent>
                </Card>
              ))

            }
          </div>
        </CardContent>
      </Card>
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
            <div className="grid grid-cols-5 gap-5">
              {containers
                .sort((a, b) => a.vmid - b.vmid)
                .slice(0, 5)
                .map((container) => (
                  <Card key={container.vmid} className="w-full">
                    <CardHeader>
                      <h2>{container.name}</h2>
                    </CardHeader>

                    <CardContent>
                      <p>
                        CPU: {container.cpu.toFixed(2)}%
                      </p>

                      <p>
                        RAM:{" "}
                        {(container.mem / 1024 / 1024 / 1024).toFixed(2)} GB
                      </p>

                      {container.status === "running" ? (
                        <Badge className="bg-green-400 text-black p-1">
                          Running
                        </Badge>
                      ) : (
                        <Badge className="bg-red-400 text-black p-1">
                          Stopped
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>

            <CollapsibleContent>
              <div className="grid grid-cols-5 gap-5 mt-5">
                {containers
                  .slice(5)
                  .sort((a, b) => a.vmid - b.vmid)
                  .map((container) => (
                    <Card key={container.vmid} className="w-full">
                      <CardHeader>
                        <h2>LXC Name: {container.name}</h2>
                      </CardHeader>

                      <CardContent>
                        <p>
                          CPU: {container.cpu.toFixed(2)}%
                        </p>

                        <p>
                          RAM:{" "}
                          {(container.mem / 1024 / 1024 / 1024).toFixed(2)} GB
                        </p>

                        {container.status === "running" ? (
                          <Badge className="bg-green-400 text-black p-1">
                            Running
                          </Badge>
                        ) : (
                          <Badge className="bg-red-400 text-black p-1">
                            Stopped
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
      <Toaster />
    </div>
  )
}