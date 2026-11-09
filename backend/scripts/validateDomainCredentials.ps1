$ErrorActionPreference = 'Stop'

try {
    $requestJson = [Console]::In.ReadToEnd()
    $request = ConvertFrom-Json -InputObject $requestJson
    if ([string]::IsNullOrWhiteSpace($request.usuario) -or
        [string]::IsNullOrWhiteSpace($request.dominio) -or
        [string]::IsNullOrEmpty($request.password)) {
        throw 'Incomplete authentication request.'
    }

    $nativeCode = @'
using System;
using System.Runtime.InteropServices;

public static class PcaWindowsLogon
{
    [DllImport("advapi32.dll", EntryPoint = "LogonUserW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool LogonUser(
        string username,
        string domain,
        string password,
        int logonType,
        int logonProvider,
        out IntPtr token);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr handle);
}
'@
    Add-Type -TypeDefinition $nativeCode -Language CSharp

    $token = [IntPtr]::Zero
    $authenticated = [PcaWindowsLogon]::LogonUser(
        $request.usuario,
        $request.dominio,
        $request.password,
        3,
        0,
        [ref]$token
    )
    $errorCode = if ($authenticated) {
        0
    } else {
        [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    }

    if ($token -ne [IntPtr]::Zero) {
        [void][PcaWindowsLogon]::CloseHandle($token)
    }

    [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject @{
            authenticated = [bool]$authenticated
            errorCode = [int]$errorCode
        })
    )
    exit 0
} catch {
    [Console]::Error.WriteLine('Windows credential validation failed.')
    exit 1
}
