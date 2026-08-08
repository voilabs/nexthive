//! Dedicated SSH deploy-key generation for GitHub accounts.
//!
//! NextHive never reads the user's personal `~/.ssh` keys. Instead each
//! SSH-based account gets its own freshly generated RSA-4096 keypair.
//!
//! RSA (rather than ed25519) is deliberate: the vendored libssh2 build
//! used by libgit2 authenticates PEM RSA keys reliably across all crypto
//! backends, including WinCNG on Windows. GitHub accepts RSA-4096 keys
//! and libssh2 negotiates the modern rsa-sha2-* signature algorithms.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::rngs::OsRng;
use rsa::pkcs1::{EncodeRsaPrivateKey, LineEnding};
use rsa::traits::PublicKeyParts;
use rsa::{RsaPrivateKey, RsaPublicKey};

use crate::errors::{AppError, AppResult};

const KEY_BITS: usize = 4096;

pub struct GeneratedKeypair {
    /// PKCS#1 PEM ("BEGIN RSA PRIVATE KEY"), zeroized on drop.
    pub private_key_pem: rsa::pkcs1::der::zeroize::Zeroizing<String>,
    /// Single-line OpenSSH `authorized_keys` format for GitHub.
    pub public_key_openssh: String,
}

pub fn generate_keypair(comment: &str) -> AppResult<GeneratedKeypair> {
    let private = RsaPrivateKey::new(&mut OsRng, KEY_BITS)
        .map_err(|e| AppError::internal(format!("RSA key generation failed: {e}")))?;
    let public = RsaPublicKey::from(&private);

    let private_key_pem = private
        .to_pkcs1_pem(LineEnding::LF)
        .map_err(|e| AppError::internal(format!("PEM encoding failed: {e}")))?;

    Ok(GeneratedKeypair {
        private_key_pem,
        public_key_openssh: encode_openssh_public(&public, comment),
    })
}

/// Encode an RSA public key as an OpenSSH public-key line:
/// `ssh-rsa <base64(wire-format)> <comment>`.
fn encode_openssh_public(key: &RsaPublicKey, comment: &str) -> String {
    fn put_chunk(buf: &mut Vec<u8>, data: &[u8]) {
        buf.extend_from_slice(&(data.len() as u32).to_be_bytes());
        buf.extend_from_slice(data);
    }

    // SSH mpint: big-endian, minimal length, leading 0x00 if the high bit
    // is set (values here are always positive).
    fn put_mpint(buf: &mut Vec<u8>, bytes_be: &[u8]) {
        let first_nonzero = bytes_be
            .iter()
            .position(|&b| b != 0)
            .unwrap_or(bytes_be.len());
        let trimmed = &bytes_be[first_nonzero..];
        if trimmed.first().is_some_and(|&b| b & 0x80 != 0) {
            let mut padded = Vec::with_capacity(trimmed.len() + 1);
            padded.push(0);
            padded.extend_from_slice(trimmed);
            put_chunk(buf, &padded);
        } else {
            put_chunk(buf, trimmed);
        }
    }

    let mut wire = Vec::new();
    put_chunk(&mut wire, b"ssh-rsa");
    put_mpint(&mut wire, &key.e().to_bytes_be());
    put_mpint(&mut wire, &key.n().to_bytes_be());

    format!("ssh-rsa {} {}", BASE64.encode(&wire), comment)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_public_key_looks_like_openssh() {
        let pair = generate_keypair("nexthive-test").unwrap();
        assert!(pair
            .public_key_openssh
            .starts_with("ssh-rsa AAAAB3NzaC1yc2E"));
        assert!(pair.public_key_openssh.ends_with(" nexthive-test"));
        assert!(pair
            .private_key_pem
            .starts_with("-----BEGIN RSA PRIVATE KEY-----"));
    }
}
