import re
from typing import Dict, Any, List

class GuardrailsService:
    # Common prompt injection signatures
    INJECTION_PATTERNS = [
        r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)\b",
        r"(?i)\byou\s+are\s+now\s+(in\s+developer\s+mode|dan|unrestricted)\b",
        r"(?i)\breveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions)\b",
        r"(?i)\bpretend\s+you\s+have\s+no\s+(safety|rules|filters)\b",
        r"(?i)\bdisregard\s+(the\s+above|all\s+guidelines)\b",
        r"(?i)\bsystem\s*:\s*override\b",
        r"(?i)\boutput\s+the\s+exact\s+prompt\s+above\b"
    ]

    # Malicious intent / harmful patterns
    TOXIC_PATTERNS = [
        r"(?i)\b(how\s+to\s+build\s+a\s+(bomb|weapon|explosive))\b",
        r"(?i)\b(write\s+a\s+(keylogger|ransomware|trojan|ddos\s+script))\b",
        r"(?i)\b(steal\s+passwords|exploit\s+vulnerability\s+to\s+hack)\b"
    ]

    # PII Regex patterns
    PII_PATTERNS = {
        "EMAIL": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
        "PHONE": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
        "CREDIT_CARD": r"\b(?:\d{4}[- ]?){3}\d{4}\b",
        "API_KEY": r"\b(sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35})\b"
    }

    @staticmethod
    def inspect_prompt(
        prompt: str,
        check_jailbreak: bool = True,
        check_pii: bool = True,
        check_toxicity: bool = True,
        mask_pii: bool = True
    ) -> Dict[str, Any]:
        flags = []
        violations = []
        sanitized_prompt = prompt
        risk_score = 0.0

        # 1. Jailbreak & Prompt Injection Check
        if check_jailbreak:
            for pattern in GuardrailsService.INJECTION_PATTERNS:
                if re.search(pattern, prompt):
                    flags.append("PROMPT_INJECTION")
                    violations.append("Attempted prompt injection or system directive override detected.")
                    risk_score = max(risk_score, 0.95)
                    break

        # 2. Harmful / Toxic content check
        if check_toxicity:
            for pattern in GuardrailsService.TOXIC_PATTERNS:
                if re.search(pattern, prompt):
                    flags.append("TOXIC_MALICIOUS_INTENT")
                    violations.append("Harmful, offensive, or malicious intent identified.")
                    risk_score = max(risk_score, 0.99)
                    break

        # 3. PII Detection & Masking
        detected_pii = []
        if check_pii:
            for pii_type, pattern in GuardrailsService.PII_PATTERNS.items():
                matches = re.findall(pattern, sanitized_prompt)
                if matches:
                    flags.append(f"PII_{pii_type}")
                    detected_pii.extend([{"type": pii_type, "value": m if isinstance(m, str) else m[0]} for m in matches])
                    if mask_pii:
                        sanitized_prompt = re.sub(pattern, f"[{pii_type}_REDACTED]", sanitized_prompt)
            
            if detected_pii:
                violations.append(f"Contains {len(detected_pii)} PII element(s) (e.g., {detected_pii[0]['type']}).")
                risk_score = max(risk_score, 0.40)

        # 4. Length check
        if len(prompt.strip()) == 0:
            flags.append("EMPTY_INPUT")
            violations.append("Prompt is empty.")
            risk_score = 1.0

        is_blocked = "PROMPT_INJECTION" in flags or "TOXIC_MALICIOUS_INTENT" in flags or "EMPTY_INPUT" in flags
        status = "blocked" if is_blocked else ("sanitized" if detected_pii and mask_pii else "passed")

        return {
            "passed": not is_blocked,
            "status": status,
            "original_prompt": prompt,
            "processed_prompt": sanitized_prompt,
            "flags": flags,
            "violations": violations,
            "detected_pii_count": len(detected_pii),
            "risk_score": round(risk_score, 3),
            "guardrails_applied": {
                "jailbreak_filter": check_jailbreak,
                "pii_filter": check_pii,
                "toxicity_filter": check_toxicity,
                "pii_masked": mask_pii and bool(detected_pii)
            }
        }

